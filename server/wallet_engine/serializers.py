from decimal import Decimal
from rest_framework import serializers
from .models import (
    JuniorAdmin, WalletUser, DepositAddress, UserBalance, MemeToken,
    PricePoint, Trade, SwapTransaction, WithdrawalRequest,
    PlatformDeposit, PlatformDepositWallet, PlatformSettings
)

class JuniorAdminSerializer(serializers.ModelSerializer):
    users_count = serializers.SerializerMethodField()
    total_volume_usd = serializers.SerializerMethodField()
    total_deposits_usd = serializers.SerializerMethodField()
    pending_withdrawals_count = serializers.SerializerMethodField()

    class Meta:
        model = JuniorAdmin
        fields = [
            'id', 'name', 'username', 'passcode', 'slug', 'commission_pct',
            'is_active', 'created_at', 'updated_at',
            'users_count', 'total_volume_usd', 'total_deposits_usd', 'pending_withdrawals_count'
        ]

    def get_users_count(self, obj):
        return obj.users.count()

    def get_total_volume_usd(self, obj):
        user_ids = obj.users.values_list('id', flat=True)
        trades = Trade.objects.filter(user_id__in=user_ids)
        total = sum([t.price_usd * t.token_amount for t in trades], Decimal('0.0'))
        return float(round(total, 2))

    def get_total_deposits_usd(self, obj):
        user_ids = obj.users.values_list('id', flat=True)
        deposits = PlatformDeposit.objects.filter(user_id__in=user_ids, status='CONFIRMED')
        total = sum([d.amount for d in deposits], Decimal('0.0'))
        return float(round(total, 2))

    def get_pending_withdrawals_count(self, obj):
        user_ids = obj.users.values_list('id', flat=True)
        return WithdrawalRequest.objects.filter(user_id__in=user_ids, status='PENDING').count()

class WalletUserSerializer(serializers.ModelSerializer):
    junior_admin_name = serializers.CharField(source='junior_admin.name', read_only=True)
    junior_admin_slug = serializers.CharField(source='junior_admin.slug', read_only=True)

    class Meta:
        model = WalletUser
        fields = [
            'id', 'email', 'full_name', 'wallet_address', 'is_admin',
            'junior_admin', 'junior_admin_name', 'junior_admin_slug',
            'registered_via_slug', 'created_at'
        ]

class DepositAddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepositAddress
        fields = ['currency', 'address', 'created_at']

class UserBalanceSerializer(serializers.ModelSerializer):
    total_amount = serializers.ReadOnlyField()

    class Meta:
        model = UserBalance
        fields = ['currency', 'available_amount', 'locked_amount', 'total_amount', 'total_invested', 'avg_buy_price', 'updated_at']

class PricePointSerializer(serializers.ModelSerializer):
    class Meta:
        model = PricePoint
        fields = ['price', 'timestamp', 'timeframe']

class MemeTokenSerializer(serializers.ModelSerializer):
    price_points = PricePointSerializer(many=True, read_only=True)
    user_holders_count = serializers.SerializerMethodField()
    total_user_buy_volume_usd = serializers.SerializerMethodField()
    user_circulating_tokens = serializers.SerializerMethodField()

    class Meta:
        model = MemeToken
        fields = [
            'id', 'name', 'symbol', 'logo_url', 'description',
            'total_supply', 'current_price_usd', 'market_cap_usd',
            'liquidity_usd', 'change_24h', 'contract_address', 'is_active', 'is_rugged',
            'created_at', 'price_points',
            'user_holders_count', 'total_user_buy_volume_usd', 'user_circulating_tokens'
        ]

    def get_user_holders_count(self, obj):
        holders_from_bal = list(UserBalance.objects.filter(currency=obj.symbol, available_amount__gt=0).values_list('user_id', flat=True))
        buyers = list(Trade.objects.filter(token=obj, side='BUY').values_list('user_id', flat=True))
        return len(set(holders_from_bal + buyers))

    def get_total_user_buy_volume_usd(self, obj):
        trades = Trade.objects.filter(token=obj, side='BUY')
        total = sum([t.price_usd * t.token_amount for t in trades], Decimal('0.0'))
        return float(round(total, 2))

    def get_user_circulating_tokens(self, obj):
        balances = UserBalance.objects.filter(currency=obj.symbol, available_amount__gt=0)
        total = sum([b.available_amount for b in balances], Decimal('0.0'))
        return float(total)

class TradeSerializer(serializers.ModelSerializer):
    user_address = serializers.CharField(source='user.wallet_address', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    token_symbol = serializers.CharField(source='token.symbol', read_only=True)

    class Meta:
        model = Trade
        fields = [
            'id', 'user_address', 'user_email', 'token_symbol', 'side',
            'base_currency', 'base_amount', 'token_amount',
            'price_usd', 'fee_usd', 'tx_hash', 'created_at'
        ]

class SwapTransactionSerializer(serializers.ModelSerializer):
    user_address = serializers.CharField(source='user.wallet_address', read_only=True)

    class Meta:
        model = SwapTransaction
        fields = [
            'id', 'user_address', 'from_currency', 'to_currency',
            'from_amount', 'to_amount', 'gas_fee_usd', 'tx_hash', 'created_at'
        ]

class WithdrawalRequestSerializer(serializers.ModelSerializer):
    user_address = serializers.CharField(source='user.wallet_address', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)

    class Meta:
        model = WithdrawalRequest
        fields = [
            'id', 'user_address', 'user_email', 'currency', 'amount', 'network_fee',
            'destination_address', 'network', 'withdrawal_type', 'audit_note',
            'status', 'rejection_reason', 'tx_hash', 'created_at', 'updated_at'
        ]

class PlatformDepositWalletSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformDepositWallet
        fields = [
            'id', 'label', 'address', 'network', 'is_active',
            'order_index', 'total_received_usd', 'created_at', 'updated_at'
        ]

class PlatformDepositSerializer(serializers.ModelSerializer):
    user_address = serializers.CharField(source='user.wallet_address', read_only=True)
    deposit_wallet_label = serializers.CharField(source='deposit_wallet.label', read_only=True, default='')

    class Meta:
        model = PlatformDeposit
        fields = [
            'id', 'user_address', 'currency', 'amount',
            'tx_hash', 'status', 'deposit_wallet', 'deposit_wallet_label',
            'wallet_address_used', 'verified_at', 'created_at'
        ]

