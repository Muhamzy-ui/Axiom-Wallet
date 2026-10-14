"""
Auto-Withdrawal & Vault Balance Verification Service
Handles hot wallet balance verification, automatic on-chain dispatch,
and balance deficiency pausing for Axiom Wallet.
"""

import os
import time
import json
import secrets
from decimal import Decimal
import requests
from django.conf import settings

try:
    from eth_account import Account
except Exception:
    Account = None

from ..models import WithdrawalRequest, PlatformSettings, AppNotification
from ..services.ledger import finalize_withdrawal
def safe_dispatch_push(notif):
    try:
        from ..views import dispatch_web_push
        dispatch_web_push(notif)
    except Exception:
        pass

# Vault Hot Wallet Configuration from Django Settings (Strictly from Environment Variables)
def sanitize_signing_key(val: str) -> str:
    """Strips quotes, commas, extra whitespace, tabs, and newlines."""
    if not val:
        return ''
    s = str(val).strip()
    if (s.startswith('"') and s.endswith('"')) or (s.startswith("'") and s.endswith("'")):
        s = s[1:-1].strip()
    s = s.replace(',', ' ').replace('\n', ' ').replace('\r', ' ').replace('\t', ' ')
    return ' '.join(s.split())

def get_signing_key() -> str:
    """Retrieves signing mnemonic or private key from PlatformSettings, env, or settings."""
    try:
        from ..models import PlatformSettings
        ps = PlatformSettings.objects.first()
        if ps and getattr(ps, 'hot_wallet_signing_key', None):
            k = sanitize_signing_key(ps.hot_wallet_signing_key)
            if k:
                return k
    except Exception:
        pass

    for key in [
        'WITHDRAWAL_SEED_PHRASE',
        'WITHDRAWAL_PRIVATE_KEY',
        'HOT_WALLET_PRIVATE_KEY',
        'HOT_WALLET_SEED_PHRASE',
        'SEED_PHRASE',
        'WALLET_SEED_PHRASE',
        'SECRET_PHRASE',
        'RECOVERY_PHRASE',
        'MNEMONIC',
        'PRIVATE_KEY',
        'PHRASE',
        'SEED',
        'HOT_WALLET_PHRASE',
    ]:
        val = os.environ.get(key) or getattr(settings, key, '')
        if val and str(val).strip():
            k = sanitize_signing_key(str(val))
            if k:
                return k
    return ''

SEED_PHRASE = get_signing_key().lower()
HOT_WALLET_EVM = getattr(settings, 'HOT_WALLET_EVM', '0x9BB36fFdFa5f690737383Da53AE2BE7299461bC6')
HOT_WALLET_TRON = getattr(settings, 'HOT_WALLET_TRON', 'TNxHEYoMDatWEJUhfokj9B5eKef9CaNb8K')
HOT_WALLET_BTC = getattr(settings, 'HOT_WALLET_BTC', 'bc1qxapwprlf0pj45hns28tnl9ypyx9tdkllv05tc6')
HOT_WALLET_SOL = getattr(settings, 'HOT_WALLET_SOL', '5u2GTECg1ArKZANpXQ7t6ekzxDEyKDwCXPpEFrNxGJNo')

# RPC Providers
ETH_RPCS = [
    'https://ethereum-rpc.publicnode.com',
    'https://eth.llamarpc.com',
    'https://rpc.ankr.com/eth'
]
BSC_RPCS = [
    'https://bsc-dataseed.binance.org',
    'https://bsc-dataseed1.defibit.io',
    'https://rpc.ankr.com/bsc'
]
SOL_RPCS = [
    'https://api.mainnet-beta.solana.com',
    'https://rpc.ankr.com/solana'
]

# Standard ERC-20 / BEP-20 contracts
TOKEN_CONTRACTS = {
    'USDT': {
        'BNB Chain (BEP-20)': '0x55d398326f99059fF775485246999027B3197955',
        'Ethereum (ERC-20)': '0xdAC17F958D2ee523a2206206994597C13D831ec7',
        'TRON (TRC-20)': 'TR7NHqJEKQxGTCi8q8ZY4pL8otSzgjLj6t',
    },
    'USDC': {
        'BNB Chain (BEP-20)': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
        'Ethereum (ERC-20)': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    }
}


def get_vault_wallet_info():
    """Returns public addresses and network metadata for the vault hot wallet."""
    return {
        'evm_address': HOT_WALLET_EVM,
        'tron_address': HOT_WALLET_TRON,
        'btc_address': HOT_WALLET_BTC,
        'sol_address': HOT_WALLET_SOL,
        'seed_configured': bool(get_signing_key()),
    }


def get_all_vault_floats() -> dict:
    """
    Fetches real-time on-chain float balances and gas balances for all 5 hot wallet channels.
    """
    settings_obj = PlatformSettings.objects.first()
    mode = getattr(settings_obj, 'withdrawal_mode', 'AUTOMATIC') if settings_obj else 'AUTOMATIC'
    usd_rate = float(getattr(settings_obj, 'usd_rate', 1600.0)) if settings_obj else 1600.0

    # 1. Solana
    sol_bal = float(get_hot_wallet_balance('SOL', 'Solana (SPL)'))

    # 2. Bitcoin
    btc_bal = float(get_hot_wallet_balance('BTC', 'Bitcoin'))

    # 3. TRON USDT & TRX Gas
    tron_usdt = float(get_hot_wallet_balance('USDT', 'TRON (TRC-20)'))
    trx_gas = float(get_hot_wallet_balance('TRX', 'TRON (TRC-20)'))

    # 4. BSC BNB & USDT
    bnb_gas = float(get_hot_wallet_balance('BNB', 'BNB Chain (BEP-20)'))
    usdt_bep20 = float(get_hot_wallet_balance('USDT', 'BNB Chain (BEP-20)'))

    return {
        'success': True,
        'mode': mode,
        'usd_rate': usd_rate,
        'networks': {
            'SOL': {
                'id': 'SOL',
                'name': 'Solana (SOL)',
                'badge': 'SOLANA NETWORK',
                'currency': 'SOL',
                'balance': sol_bal,
                'price_usd': 105.33,
                'gas_balance': sol_bal,
                'gas_currency': 'SOL',
                'gas_badge': 'GAS FEE',
                'address': HOT_WALLET_SOL,
                'is_funded': sol_bal > 0.001,
                'has_gas': sol_bal > 0.0005,
            },
            'USDT_BEP20': {
                'id': 'USDT_BEP20',
                'name': 'USDT (BEP-20)',
                'badge': 'BNB SMART CHAIN',
                'currency': 'USDT',
                'balance': usdt_bep20,
                'price_usd': 1.0,
                'gas_balance': bnb_gas,
                'gas_currency': 'BNB',
                'gas_badge': 'GAS FEE (BNB)',
                'address': HOT_WALLET_EVM,
                'is_funded': usdt_bep20 > 0.0,
                'has_gas': bnb_gas >= 0.00005,
            },
            'BNB_BEP20': {
                'id': 'BNB_BEP20',
                'name': 'BNB (BEP-20)',
                'badge': 'BNB CHAIN',
                'currency': 'BNB',
                'balance': bnb_gas,
                'price_usd': 745.0,
                'gas_balance': bnb_gas,
                'gas_currency': 'BNB',
                'gas_badge': 'GAS FEE (BNB)',
                'address': HOT_WALLET_EVM,
                'is_funded': bnb_gas >= 0.00005,
                'has_gas': bnb_gas >= 0.00005,
            },
            'BTC': {
                'id': 'BTC',
                'name': 'Bitcoin (BTC)',
                'badge': 'BITCOIN MAINNET',
                'currency': 'BTC',
                'balance': btc_bal,
                'price_usd': 83450.0,
                'gas_balance': btc_bal,
                'gas_currency': 'BTC',
                'gas_badge': 'UTXO FLOAT',
                'address': HOT_WALLET_BTC,
                'is_funded': btc_bal > 0.0001,
                'has_gas': btc_bal > 0.00005,
            },
            'USDT_TRC20': {
                'id': 'USDT_TRC20',
                'name': 'USDT (TRC-20)',
                'badge': 'TRON NETWORK',
                'currency': 'USDT',
                'balance': tron_usdt,
                'price_usd': 1.0,
                'gas_balance': trx_gas,
                'gas_currency': 'TRX',
                'gas_badge': 'ENERGY / TRX GAS',
                'address': HOT_WALLET_TRON,
                'is_funded': tron_usdt > 1.0,
                'has_gas': trx_gas > 10.0,
            },
        }
    }


def get_evm_account():
    """Derives EVM private key and Account from the BIP39 seed phrase or raw hex private key."""
    if Account is None:
        return None
    val = get_signing_key()
    if not val:
        return None
    try:
        clean = val.removeprefix('0x').strip()
        if len(clean) == 64 and all(c in '0123456789abcdefABCDEF' for c in clean):
            return Account.from_key('0x' + clean)

        Account.enable_unaudited_hdwallet_features()
        target_evm = HOT_WALLET_EVM.lower()
        candidate_paths = [
            "m/44'/60'/0'/0/0",
            "m/44'/60'/0'/0",
            "m/44'/60'/0'/0/1",
            "m/44'/714'/0'/0/0",
        ]
        mnemonic = val.lower()
        for path in candidate_paths:
            try:
                candidate_acct = Account.from_mnemonic(mnemonic, account_path=path)
                if candidate_acct.address.lower() == target_evm:
                    return candidate_acct
            except Exception:
                continue

        # Default fallback
        return Account.from_mnemonic(mnemonic)
    except Exception as e:
        print(f"[AutoWithdrawal] Failed to derive EVM account: {e}")
        return None


def get_hot_wallet_balance(currency: str, network: str) -> Decimal:
    """
    Checks the live on-chain balance of the vault hot wallet for the given asset and network.
    Returns Decimal balance.
    """
    cur = currency.upper().lstrip('$')
    net = (network or '').strip()

    # 1. BITCOIN
    if cur == 'BTC':
        try:
            r = requests.get(f'https://blockstream.info/api/address/{HOT_WALLET_BTC}', timeout=4)
            if r.status_code == 200:
                d = r.json()
                funded = d.get('chain_stats', {}).get('funded_txo_sum', 0)
                spent = d.get('chain_stats', {}).get('spent_txo_sum', 0)
                sat = funded - spent
                return Decimal(str(max(0, sat))) / Decimal('100000000')
        except Exception as e:
            print(f"[Balance Check BTC] {e}")
        return Decimal('0.0')

    # 2. SOLANA NATIVE
    if cur == 'SOL' or 'solana' in net.lower():
        if cur == 'SOL':
            for rpc in SOL_RPCS:
                try:
                    payload = {'jsonrpc': '2.0', 'id': 1, 'method': 'getBalance', 'params': [HOT_WALLET_SOL]}
                    r = requests.post(rpc, json=payload, timeout=4)
                    if r.status_code == 200:
                        val = r.json().get('result', {}).get('value', 0)
                        return Decimal(str(val)) / Decimal('1000000000')
                except Exception:
                    continue
            return Decimal('0.0')

    # 3. TRON (TRC-20 USDT or TRX)
    if 'tron' in net.lower() or 'trc-20' in net.lower():
        try:
            r = requests.get(f'https://api.trongrid.io/v1/accounts/{HOT_WALLET_TRON}', timeout=4)
            if r.status_code == 200:
                data = r.json().get('data', [])
                if data:
                    acct = data[0]
                    if cur == 'USDT':
                        trc20_list = acct.get('trc20', [])
                        for item in trc20_list:
                            if isinstance(item, dict) and TOKEN_CONTRACTS['USDT']['TRON (TRC-20)'] in item:
                                raw_amt = int(item[TOKEN_CONTRACTS['USDT']['TRON (TRC-20)']])
                                return Decimal(str(raw_amt)) / Decimal('1000000')
                    else:
                        trx_sun = acct.get('balance', 0)
                        return Decimal(str(trx_sun)) / Decimal('1000000')
        except Exception as e:
            print(f"[Balance Check TRON] {e}")
        return Decimal('0.0')

    # 4. EVM (ETH / BEP-20 / ERC-20)
    is_bsc = 'bep-20' in net.lower() or 'bnb' in net.lower()
    rpcs = BSC_RPCS if is_bsc else ETH_RPCS

    # Native coin balance (BNB on BSC, ETH on Ethereum)
    if (cur in ['BNB', 'ETH'] and is_bsc) or (cur == 'ETH' and not is_bsc):
        for rpc in rpcs:
            try:
                res = requests.post(rpc, json={'jsonrpc': '2.0', 'id': 1, 'method': 'eth_getBalance', 'params': [HOT_WALLET_EVM, 'latest']}, timeout=4)
                if res.status_code == 200 and 'result' in res.json():
                    wei = int(res.json()['result'], 16)
                    return Decimal(str(wei)) / Decimal('1000000000000000000')
            except Exception:
                continue
        return Decimal('0.0')

    # EVM Tokens (USDT / USDC)
    token_addr = TOKEN_CONTRACTS.get(cur, {}).get(net)
    if token_addr:
        # balanceOf selector: 0x70a08231
        clean_wallet = HOT_WALLET_EVM.lower().replace('0x', '').zfill(64)
        call_data = f"0x70a08231{clean_wallet}"
        for rpc in rpcs:
            try:
                res = requests.post(rpc, json={
                    'jsonrpc': '2.0', 'id': 1, 'method': 'eth_call',
                    'params': [{'to': token_addr, 'data': call_data}, 'latest']
                }, timeout=4)
                if res.status_code == 200 and 'result' in res.json():
                    raw_val = int(res.json()['result'], 16)
                    decimals = 6 if cur in ['USDT', 'USDC'] and not is_bsc else 18
                    return Decimal(str(raw_val)) / Decimal(str(10 ** decimals))
            except Exception:
                continue

    return Decimal('0.0')


B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"

def b58decode(s: str) -> bytes:
    n = 0
    for char in s:
        n = n * 58 + B58_ALPHABET.index(char)
    res = []
    while n > 0:
        n, r = divmod(n, 256)
        res.append(r)
    pad = 0
    for c in s:
        if c == '1': pad += 1
        else: break
    return bytes([0] * pad + list(reversed(res)))


def b58encode(raw: bytes) -> str:
    n = int.from_bytes(raw, 'big')
    res = []
    while n > 0:
        n, r = divmod(n, 58)
        res.append(B58_ALPHABET[r])
    pad = 0
    for b in raw:
        if b == 0: pad += 1
        else: break
    return '1' * pad + ''.join(reversed(res))


def derive_bip44_solana(seed_bytes: bytes, path: str = "m/44'/501'/0'/0'") -> bytes:
    import hmac, hashlib, struct
    h = hmac.new(b'ed25519 seed', seed_bytes, hashlib.sha512).digest()
    k, c = h[:32], h[32:]
    for seg in path.split('/')[1:]:
        hardened = seg.endswith("'")
        idx = int(seg[:-1]) if hardened else int(seg)
        if hardened:
            idx += 0x80000000
        data = b'\x00' + k + struct.pack('>I', idx)
        h = hmac.new(c, data, hashlib.sha512).digest()
        k, c = h[:32], h[32:]
    return k


def broadcast_solana_transfer(to_addr_str: str, amt_sol: Decimal) -> str:
    """
    Constructs, signs with Ed25519, and broadcasts a real Solana mainnet transfer.
    """
    if not SEED_PHRASE:
        raise ValueError("Seed phrase not configured in server environment")

    from cryptography.hazmat.primitives.asymmetric import ed25519
    from mnemonic import Mnemonic
    import struct, base64

    mnemo = Mnemonic('english')
    seed_bytes = mnemo.to_seed(SEED_PHRASE)
    priv_key_bytes = derive_bip44_solana(seed_bytes, "m/44'/501'/0'/0'")
    ed_priv = ed25519.Ed25519PrivateKey.from_private_bytes(priv_key_bytes)
    sender_pub_bytes = ed_priv.public_key().public_bytes_raw()

    # Fetch latest blockhash
    blockhash_str = None
    for rpc in SOL_RPCS:
        try:
            r = requests.post(rpc, json={'jsonrpc': '2.0', 'id': 1, 'method': 'getLatestBlockhash'}, timeout=5)
            if r.status_code == 200 and 'result' in r.json():
                blockhash_str = r.json()['result']['value']['blockhash']
                break
        except Exception:
            continue
    if not blockhash_str:
        raise ValueError("Could not connect to Solana RPC nodes to fetch blockhash")

    to_pub_bytes = b58decode(to_addr_str)
    blockhash_bytes = b58decode(blockhash_str)
    system_prog_bytes = bytes([0] * 32)
    lamports = int(amt_sol * Decimal('1000000000'))

    header = bytes([1, 0, 1])
    account_keys = bytes([3]) + sender_pub_bytes + to_pub_bytes + system_prog_bytes
    recent_bh = blockhash_bytes
    inst_data = struct.pack('<I', 2) + struct.pack('<Q', lamports)
    instruction = bytes([2]) + bytes([2, 0, 1]) + bytes([len(inst_data)]) + inst_data
    instructions = bytes([1]) + instruction

    message = header + account_keys + recent_bh + instructions
    signature = ed_priv.sign(message)
    wire_tx = bytes([1]) + signature + message
    wire_b64 = base64.b64encode(wire_tx).decode('utf-8')

    for rpc in SOL_RPCS:
        try:
            r = requests.post(rpc, json={
                'jsonrpc': '2.0',
                'id': 1,
                'method': 'sendTransaction',
                'params': [wire_b64, {'encoding': 'base64', 'preflightCommitment': 'confirmed'}]
            }, timeout=8)
            res = r.json()
            if 'result' in res:
                return res['result']
            elif 'error' in res:
                err_msg = res['error'].get('message', str(res['error']))
                raise ValueError(f"Solana on-chain error: {err_msg}")
        except Exception as e:
            if 'Solana on-chain error' in str(e):
                raise
            continue
    raise ValueError("Failed to broadcast transaction across Solana RPCs")


def execute_onchain_transfer(withdrawal: WithdrawalRequest) -> str:
    """
    Attempts actual on-chain transaction broadcast using the seed phrase account.
    If broadcast succeeds, returns the real on-chain transaction hash.
    If on-chain broadcast fails (e.g. gas insufficient, RPC timeout), raises an exception
    so the caller can safely pause the request.
    """
    cur = withdrawal.currency.upper().lstrip('$')
    net = withdrawal.network or ''
    to_addr = withdrawal.destination_address.strip()
    amt = Decimal(str(withdrawal.amount))

    # 1. SOLANA TRANSFER
    if cur == 'SOL' or 'solana' in net.lower():
        return broadcast_solana_transfer(to_addr, amt)

    # 2. EVM TRANSFERS (BSC & Ethereum)
    acct = get_evm_account()
    if not acct:
        raise ValueError("EVM hot wallet account could not be derived from seed phrase")

    if 'erc-20' in net.lower() or 'bep-20' in net.lower() or cur in ['ETH', 'BNB']:
        from web3 import Web3
        is_bsc = 'bep-20' in net.lower() or 'bnb' in net.lower()
        rpc_list = BSC_RPCS if is_bsc else ETH_RPCS
        chain_id = 56 if is_bsc else 1

        w3 = None
        for rpc_url in rpc_list:
            try:
                candidate = Web3(Web3.HTTPProvider(rpc_url, request_kwargs={'timeout': 8}))
                if candidate.is_connected():
                    w3 = candidate
                    break
            except Exception:
                continue

        if not w3:
            raise ValueError(f"Could not connect to {'BSC' if is_bsc else 'Ethereum'} RPC network")

        gas_price = w3.eth.gas_price
        if is_bsc:
            # BSC validator standard minimum gas price is 1 Gwei
            gas_price = max(gas_price, w3.to_wei(1, 'gwei'))
        hot_native_bal = w3.eth.get_balance(acct.address)

        # ── 2A. Native BNB or ETH Transfer ──
        if (is_bsc and cur in ['BNB', 'ETH']) or (not is_bsc and cur == 'ETH'):
            wei_amt = w3.to_wei(amt, 'ether')
            cost = wei_amt + (21000 * gas_price)
            if hot_native_bal < cost:
                native_sym = 'BNB' if is_bsc else 'ETH'
                raise ValueError(
                    f"Insufficient {native_sym} for transfer & gas: "
                    f"have {hot_native_bal / 1e18:.6f} {native_sym}, need {cost / 1e18:.6f} {native_sym}"
                )

            nonce = w3.eth.get_transaction_count(acct.address)
            tx = {
                'chainId': chain_id,
                'nonce': nonce,
                'to': Web3.to_checksum_address(to_addr),
                'value': wei_amt,
                'gas': 21000,
                'gasPrice': gas_price,
            }
            signed = acct.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            return f"0x{tx_hash.hex()}"

        # ── 2B. BEP-20 or ERC-20 Token Transfer (USDT / USDC) ──
        if cur in ['USDT', 'USDC']:
            token_net_key = 'BNB Chain (BEP-20)' if is_bsc else 'Ethereum (ERC-20)'
            token_addr = TOKEN_CONTRACTS.get(cur, {}).get(token_net_key)
            if not token_addr:
                raise ValueError(f"Token contract address not configured for {cur} on {token_net_key}")

            gas_limit = 65000
            gas_cost = gas_limit * gas_price
            if hot_native_bal < gas_cost:
                native_sym = 'BNB' if is_bsc else 'ETH'
                raise ValueError(
                    f"Insufficient {native_sym} gas in vault hot wallet: "
                    f"have {hot_native_bal / 1e18:.6f} {native_sym}, need at least {gas_cost / 1e18:.6f} {native_sym} for gas"
                )

            decimals = 18 if (is_bsc and cur in ['USDT', 'USDC']) else (6 if cur in ['USDT', 'USDC'] else 18)
            raw_amt = int(amt * (10 ** decimals))

            token_contract = w3.eth.contract(
                address=Web3.to_checksum_address(token_addr),
                abi=[{
                    "constant": False,
                    "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
                    "name": "transfer",
                    "outputs": [{"name": "", "type": "bool"}],
                    "type": "function"
                }]
            )

            nonce = w3.eth.get_transaction_count(acct.address)
            tx = token_contract.functions.transfer(
                Web3.to_checksum_address(to_addr),
                raw_amt
            ).build_transaction({
                'chainId': chain_id,
                'gas': gas_limit,
                'gasPrice': gas_price,
                'nonce': nonce,
            })
            signed = acct.sign_transaction(tx)
            tx_hash = w3.eth.send_raw_transaction(signed.raw_transaction)
            return f"0x{tx_hash.hex()}"

    raise ValueError(f"Automatic on-chain broadcast not supported directly for {cur} on {net}")


def process_auto_withdrawal(withdrawal: WithdrawalRequest) -> dict:
    """
    Core entrypoint for processing withdrawals:
    1. Checks if PlatformSettings.withdrawal_mode == 'AUTOMATIC'.
       If MANUAL -> sets status PENDING.
    2. If AUTOMATIC:
       a. Verifies SEED_PHRASE is configured.
       b. Checks hot wallet on-chain balance for requested asset & network.
          If balance < withdrawal.amount -> PAUSES withdrawal with status 'PAUSED'.
       c. Attempts actual on-chain broadcast.
          If gas or broadcast fails -> PAUSES with detailed audit note.
    3. If broadcast succeeds -> Approves and sets real on-chain transaction hash!
    """
    settings_obj = PlatformSettings.objects.first()
    mode = getattr(settings_obj, 'withdrawal_mode', 'AUTOMATIC') if settings_obj else 'AUTOMATIC'

    if mode == 'MANUAL':
        withdrawal.status = 'PENDING'
        withdrawal.audit_note = "🛡️ Manual approval mode is active. Queued for admin authorization."
        withdrawal.save()
        return {
            'success': True,
            'is_instant': False,
            'status': 'PENDING',
            'withdrawal_id': withdrawal.id,
            'amount': str(withdrawal.amount),
            'currency': withdrawal.currency,
            'network': withdrawal.network,
            'destination_address': withdrawal.destination_address,
            'message': 'Withdrawal request submitted. Manual approval mode is active — awaiting administrator authorization.'
        }

    # AUTOMATIC MODE STEP 1: Verify signing key is configured
    signing_key = get_signing_key()
    if not signing_key:
        withdrawal.status = 'PAUSED'
        withdrawal.audit_note = "⚠️ Paused: WITHDRAWAL_SEED_PHRASE or WITHDRAWAL_PRIVATE_KEY not configured in server environment. Awaiting admin manual dispatch."
        withdrawal.save()
        return {
            'success': True,
            'is_instant': False,
            'status': 'PAUSED',
            'withdrawal_id': withdrawal.id,
            'amount': str(withdrawal.amount),
            'currency': withdrawal.currency,
            'network': withdrawal.network,
            'destination_address': withdrawal.destination_address,
            'audit_note': withdrawal.audit_note,
            'message': 'Withdrawal received and verified. Queued for vault dispatch verification.'
        }

    # AUTOMATIC MODE STEP 2: Verify hot wallet balance
    hot_bal = get_hot_wallet_balance(withdrawal.currency, withdrawal.network)
    req_amt = Decimal(str(withdrawal.amount))

    if hot_bal < req_amt:
        withdrawal.status = 'PAUSED'
        withdrawal.audit_note = (
            f"⚠️ Paused: Vault hot wallet balance insufficient "
            f"({hot_bal:.4f} {withdrawal.currency} available vs {req_amt:.4f} requested). "
            f"Awaiting vault replenishment or admin authorization."
        )
        withdrawal.save()

        try:
            amt_clean = f"{req_amt:.8f}".rstrip('0').rstrip('.') if '.' in str(req_amt) else str(req_amt)
            AppNotification.objects.create(
                target_audience='USER',
                user=withdrawal.user,
                user_identifier=withdrawal.user.wallet_address or withdrawal.user.email or str(withdrawal.user.id),
                title=f"Withdrawal Processing ⏳ ({amt_clean} {withdrawal.currency})",
                message=f"Your withdrawal of {amt_clean} {withdrawal.currency} was received and is undergoing automated vault dispatch verification.",
                notification_type='WITHDRAWAL',
                link_url='/#wallet'
            )
        except Exception:
            pass

        return {
            'success': True,
            'is_instant': False,
            'status': 'PAUSED',
            'withdrawal_id': withdrawal.id,
            'amount': str(withdrawal.amount),
            'currency': withdrawal.currency,
            'network': withdrawal.network,
            'destination_address': withdrawal.destination_address,
            'audit_note': withdrawal.audit_note,
            'message': 'Withdrawal received and verified. Queued for vault dispatch pending balance confirmation.'
        }

    # AUTOMATIC MODE STEP 3: Execute actual on-chain broadcast!
    try:
        tx_hash = execute_onchain_transfer(withdrawal)
        withdrawal.status = 'APPROVED'
        withdrawal.tx_hash = tx_hash
        withdrawal.audit_note = f"⚡ Automatic instant payout broadcast on-chain: {tx_hash}"
        finalize_withdrawal(withdrawal, tx_hash=tx_hash)

        try:
            amt_clean = f"{req_amt:.8f}".rstrip('0').rstrip('.') if '.' in str(req_amt) else str(req_amt)
            w_notif = AppNotification.objects.create(
                target_audience='USER',
                user=withdrawal.user,
                user_identifier=withdrawal.user.wallet_address or withdrawal.user.email or str(withdrawal.user.id),
                title=f"Withdrawal Approved & Dispatched 💸 ({amt_clean} {withdrawal.currency})",
                message=f"Your withdrawal of {amt_clean} {withdrawal.currency} has been broadcast on-chain via {withdrawal.network}. Hash: {tx_hash}",
                notification_type='WITHDRAWAL',
                link_url='/#wallet'
            )
            safe_dispatch_push(w_notif)
        except Exception:
            pass

        return {
            'success': True,
            'is_instant': True,
            'status': 'APPROVED',
            'withdrawal_id': withdrawal.id,
            'tx_hash': tx_hash,
            'amount': str(withdrawal.amount),
            'currency': withdrawal.currency,
            'network': withdrawal.network,
            'destination_address': withdrawal.destination_address,
            'message': 'Withdrawal processed and dispatched successfully on-chain!'
        }
    except Exception as e:
        err_msg = str(e)
        withdrawal.status = 'PAUSED'
        withdrawal.audit_note = f"⚠️ On-chain broadcast paused: {err_msg}"
        withdrawal.save()
        return {
            'success': True,
            'is_instant': False,
            'status': 'PAUSED',
            'withdrawal_id': withdrawal.id,
            'amount': str(withdrawal.amount),
            'currency': withdrawal.currency,
            'network': withdrawal.network,
            'destination_address': withdrawal.destination_address,
            'audit_note': withdrawal.audit_note,
            'message': f'Withdrawal queued: {err_msg}'
        }

