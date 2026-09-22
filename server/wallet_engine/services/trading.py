import uuid
from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from ..models import MemeToken, Trade, SwapTransaction, PricePoint, PlatformSettings
from .ledger import credit_balance, debit_balance

BASE_RATES_USD = {
    'SOL': Decimal('179.84'),
    'ETH': Decimal('2650.00'),
    'USDT': Decimal('1.00'),
    'USDC': Decimal('1.00'),
    'BTC': Decimal('77724.00'),
}

def generate_tx_hash(prefix='tx_'):
    return prefix + uuid.uuid4().hex[:32]

@transaction.atomic
def execute_buy(user, token_symbol, base_currency, base_amount):
    token = MemeToken.objects.select_for_update().get(symbol=token_symbol.upper())
    if not token.is_active or token.is_rugged:
        raise ValidationError(f"Trading for {token.symbol} is currently disabled or rugged.")

    settings = PlatformSettings.objects.first()
    if settings and settings.is_trading_paused:
        raise ValidationError("Trading is temporarily paused by platform administrator.")

    fee_pct = settings.trading_fee_pct if settings else Decimal('1.0')

    base_curr = base_currency.upper()
    if base_curr not in BASE_RATES_USD:
        raise ValidationError(f"Unsupported base currency {base_curr}")

    base_amount_dec = Decimal(str(base_amount))
    if base_amount_dec <= Decimal('0'):
        raise ValidationError("Amount must be greater than zero.")

    # Debit base currency from user
    debit_balance(user, base_curr, base_amount_dec)

    # Calculate USD value
    usd_rate = BASE_RATES_USD[base_curr]
    gross_usd = base_amount_dec * usd_rate
    fee_usd = gross_usd * (fee_pct / Decimal('100.0'))
    net_usd = gross_usd - fee_usd

    # Compute tokens received
    price_usd = token.current_price_usd
    tokens_received = net_usd / price_usd

    # Price impact: slight increase based on trade size vs liquidity
    impact_pct = min(Decimal('5.0'), (gross_usd / token.liquidity_usd) * Decimal('50.0'))
    new_price = price_usd * (Decimal('1.0') + (impact_pct / Decimal('100.0')))
    token.current_price_usd = new_price
    token.market_cap_usd = new_price * token.total_supply
    token.liquidity_usd += net_usd * Decimal('0.5')
    token.change_24h += impact_pct
    token.save()

    # Record price point
    PricePoint.objects.create(token=token, price=new_price, timeframe='1H')

    # Credit tokens to user
    credit_balance(user, token.symbol, tokens_received)

    # Record trade
    trade = Trade.objects.create(
        user=user,
        token=token,
        side='BUY',
        base_currency=base_curr,
        base_amount=base_amount_dec,
        token_amount=tokens_received,
        price_usd=price_usd,
        fee_usd=fee_usd,
        tx_hash=generate_tx_hash('buy_')
    )

    return {
        'trade': trade,
        'tokens_received': tokens_received,
        'new_price': new_price,
        'fee_usd': fee_usd,
        'tx_hash': trade.tx_hash
    }

@transaction.atomic
def execute_sell(user, token_symbol, base_currency, token_amount):
    token = MemeToken.objects.select_for_update().get(symbol=token_symbol.upper())
    if not token.is_active:
        raise ValidationError(f"Trading for {token.symbol} is currently disabled.")

    settings = PlatformSettings.objects.first()
    if settings and settings.is_trading_paused:
        raise ValidationError("Trading is temporarily paused by platform administrator.")

    fee_pct = settings.trading_fee_pct if settings else Decimal('1.0')

    base_curr = base_currency.upper()
    if base_curr not in BASE_RATES_USD:
        raise ValidationError(f"Unsupported base currency {base_curr}")

    token_amount_dec = Decimal(str(token_amount))
    if token_amount_dec <= Decimal('0'):
        raise ValidationError("Amount must be greater than zero.")

    # Debit tokens from user
    debit_balance(user, token.symbol, token_amount_dec)

    # Calculate USD value
    price_usd = token.current_price_usd
    gross_usd = token_amount_dec * price_usd
    fee_usd = gross_usd * (fee_pct / Decimal('100.0'))
    net_usd = gross_usd - fee_usd

    # Convert net USD to base currency
    usd_rate = BASE_RATES_USD[base_curr]
    base_received = net_usd / usd_rate

    # Price impact: price decreases
    impact_pct = min(Decimal('8.0'), (gross_usd / token.liquidity_usd) * Decimal('50.0'))
    new_price = max(Decimal('0.00000001'), price_usd * (Decimal('1.0') - (impact_pct / Decimal('100.0'))))
    token.current_price_usd = new_price
    token.market_cap_usd = new_price * token.total_supply
    token.change_24h -= impact_pct
    token.save()

    # Record price point
    PricePoint.objects.create(token=token, price=new_price, timeframe='1H')

    # Credit base currency to user
    credit_balance(user, base_curr, base_received)

    # Record trade
    trade = Trade.objects.create(
        user=user,
        token=token,
        side='SELL',
        base_currency=base_curr,
        base_amount=base_received,
        token_amount=token_amount_dec,
        price_usd=price_usd,
        fee_usd=fee_usd,
        tx_hash=generate_tx_hash('sell_')
    )

    return {
        'trade': trade,
        'base_received': base_received,
        'new_price': new_price,
        'fee_usd': fee_usd,
        'tx_hash': trade.tx_hash
    }

@transaction.atomic
def execute_swap(user, from_currency, to_currency, from_amount):
    from_curr = from_currency.upper()
    to_curr = to_currency.upper()
    from_amount_dec = Decimal(str(from_amount))

    if from_amount_dec <= Decimal('0'):
        raise ValidationError("Swap amount must be greater than zero.")
    if from_curr == to_curr:
        raise ValidationError("Cannot swap identical tokens.")

    # Check if either token is a meme token or base currency
    meme_tokens = {m.symbol.upper(): m for m in MemeToken.objects.all()}

    # Compute USD value of from_amount
    if from_curr in BASE_RATES_USD:
        from_usd = from_amount_dec * BASE_RATES_USD[from_curr]
    elif from_curr in meme_tokens:
        from_usd = from_amount_dec * meme_tokens[from_curr].current_price_usd
    else:
        raise ValidationError(f"Unrecognized token {from_curr}")

    # Gas fee: small fixed fee or 0.3%
    gas_fee_usd = Decimal('0.35')
    net_usd = max(Decimal('0.01'), from_usd - gas_fee_usd)

    # Compute amount of to_currency received
    if to_curr in BASE_RATES_USD:
        to_amount_dec = net_usd / BASE_RATES_USD[to_curr]
    elif to_curr in meme_tokens:
        to_amount_dec = net_usd / meme_tokens[to_curr].current_price_usd
    else:
        raise ValidationError(f"Unrecognized token {to_curr}")

    # Debit and Credit
    debit_balance(user, from_curr, from_amount_dec)
    credit_balance(user, to_curr, to_amount_dec)

    swap_tx = SwapTransaction.objects.create(
        user=user,
        from_currency=from_curr,
        to_currency=to_curr,
        from_amount=from_amount_dec,
        to_amount=to_amount_dec,
        gas_fee_usd=gas_fee_usd,
        tx_hash=generate_tx_hash('swp_')
    )

    return {
        'swap': swap_tx,
        'from_amount': from_amount_dec,
        'to_amount': to_amount_dec,
        'gas_fee_usd': gas_fee_usd,
        'tx_hash': swap_tx.tx_hash
    }
