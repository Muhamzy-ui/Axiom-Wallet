from decimal import Decimal
from rest_framework import serializers
from .models import (
    JuniorAdmin, WalletUser, DepositAddress, UserBalance, MemeToken,
    PricePoint, Trade, SwapTransaction, WithdrawalRequest,
    PlatformDeposit, PlatformDepositWallet, PlatformSettings, CopyTradingPosition
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
        if hasattr(obj, '_precomputed_users_count'):
            return obj._precomputed_users_count
        return obj.users.count()

    def get_total_volume_usd(self, obj):
        if hasattr(obj, '_precomputed_total_volume_usd'):
            return obj._precomputed_total_volume_usd
        user_ids = obj.users.values_list('id', flat=True)
        trades = Trade.objects.filter(user_id__in=user_ids)
        total = sum([t.price_usd * t.token_amount for t in trades], Decimal('0.0'))
        return float(round(total, 2))

    def get_total_deposits_usd(self, obj):
        if hasattr(obj, '_precomputed_total_deposits_usd'):
            return obj._precomputed_total_deposits_usd
        user_ids = obj.users.values_list('id', flat=True)
        deposits = PlatformDeposit.objects.filter(user_id__in=user_ids, status='CONFIRMED')
        total = sum([d.amount for d in deposits], Decimal('0.0'))
        return float(round(total, 2))

    def get_pending_withdrawals_count(self, obj):
        if hasattr(obj, '_precomputed_pending_withdrawals_count'):
            return obj._precomputed_pending_withdrawals_count
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

class MemeTokenListSerializer(serializers.ModelSerializer):
    """Ultra-lightweight serializer for high-frequency token listings (zero N+1 queries, minimal payload)."""
    user_holders_count = serializers.SerializerMethodField()
    real_buyers_count = serializers.SerializerMethodField()
    total_buyers_count = serializers.IntegerField(read_only=True)
    total_user_buy_volume_usd = serializers.SerializerMethodField()
    user_circulating_tokens = serializers.SerializerMethodField()

    class Meta:
        model = MemeToken
        fields = [
            'id', 'name', 'symbol', 'logo_url', 'description',
            'total_supply', 'current_price_usd', 'market_cap_usd',
            'liquidity_usd', 'change_24h', 'contract_address', 'is_active', 'is_rugged', 'pair_currency',
            'is_verified', 'is_liquidity_locked', 'is_sell_blocked', 'total_buyers_count',
            'created_at', 'user_holders_count', 'real_buyers_count', 'total_user_buy_volume_usd', 'user_circulating_tokens'
        ]

    def get_user_holders_count(self, obj):
        return getattr(obj, 'user_holders_count', 25) or 25

    def get_real_buyers_count(self, obj):
        try:
            from .models import UserBalance, Trade
            from decimal import Decimal
            clean_sym = obj.symbol.upper().lstrip('$')
            holders = set(UserBalance.objects.filter(currency__iexact=clean_sym, available_amount__gt=Decimal('0.0')).values_list('user_id', flat=True))
            trade_buyers = set(Trade.objects.filter(token=obj, side='BUY').values_list('user_id', flat=True))
            return len(holders | trade_buyers)
        except Exception:
            return 0

    def get_total_user_buy_volume_usd(self, obj):
        try:
            from .models import Trade, UserBalance
            from django.db.models import Sum
            from decimal import Decimal
            clean_sym = obj.symbol.upper().lstrip('$')
            trades_sum = Trade.objects.filter(token=obj, side='BUY').aggregate(total=Sum('base_amount'))['total'] or Decimal('0.0')
            bal_sum = UserBalance.objects.filter(currency__iexact=clean_sym).aggregate(total=Sum('total_invested'))['total'] or Decimal('0.0')
            return float(max(trades_sum, bal_sum))
        except Exception:
            return 0.0

    def get_user_circulating_tokens(self, obj):
        try:
            from .models import UserBalance
            from django.db.models import Sum
            from decimal import Decimal
            clean_sym = obj.symbol.upper().lstrip('$')
            circ = UserBalance.objects.filter(currency__iexact=clean_sym).aggregate(total=Sum('available_amount'))['total'] or Decimal('0.0')
            return float(circ)
        except Exception:
            return 0.0

class MemeTokenSerializer(serializers.ModelSerializer):
    price_points = PricePointSerializer(many=True, read_only=True)
    user_holders_count = serializers.SerializerMethodField()
    real_buyers_count = serializers.SerializerMethodField()
    total_user_buy_volume_usd = serializers.SerializerMethodField()
    user_circulating_tokens = serializers.SerializerMethodField()

    class Meta:
        model = MemeToken
        fields = [
            'id', 'name', 'symbol', 'logo_url', 'description',
            'total_supply', 'current_price_usd', 'market_cap_usd',
            'liquidity_usd', 'change_24h', 'contract_address', 'is_active', 'is_rugged', 'pair_currency',
            'is_verified', 'is_liquidity_locked', 'is_sell_blocked', 'total_buyers_count',
            'created_at', 'price_points',
            'user_holders_count', 'real_buyers_count', 'total_user_buy_volume_usd', 'user_circulating_tokens'
        ]

    def get_user_holders_count(self, obj):
        return getattr(obj, 'user_holders_count', 25) or 25

    def get_real_buyers_count(self, obj):
        try:
            from .models import UserBalance, Trade
            from decimal import Decimal
            clean_sym = obj.symbol.upper().lstrip('$')
            holders = set(UserBalance.objects.filter(currency__iexact=clean_sym, available_amount__gt=Decimal('0.0')).values_list('user_id', flat=True))
            trade_buyers = set(Trade.objects.filter(token=obj, side='BUY').values_list('user_id', flat=True))
            return len(holders | trade_buyers)
        except Exception:
            return 0

    def get_total_user_buy_volume_usd(self, obj):
        try:
            from .models import Trade, UserBalance
            from django.db.models import Sum
            from decimal import Decimal
            clean_sym = obj.symbol.upper().lstrip('$')
            trades_sum = Trade.objects.filter(token=obj, side='BUY').aggregate(total=Sum('base_amount'))['total'] or Decimal('0.0')
            bal_sum = UserBalance.objects.filter(currency__iexact=clean_sym).aggregate(total=Sum('total_invested'))['total'] or Decimal('0.0')
            return float(max(trades_sum, bal_sum))
        except Exception:
            return 0.0

    def get_user_circulating_tokens(self, obj):
        try:
            from .models import UserBalance
            from django.db.models import Sum
            from decimal import Decimal
            clean_sym = obj.symbol.upper().lstrip('$')
            circ = UserBalance.objects.filter(currency__iexact=clean_sym).aggregate(total=Sum('available_amount'))['total'] or Decimal('0.0')
            return float(circ)
        except Exception:
            return 0.0

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

class CopyTradingPositionSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    user_wallet = serializers.CharField(source='user.wallet_address', read_only=True)
    user_name = serializers.CharField(source='user.full_name', read_only=True)

    class Meta:
        model = CopyTradingPosition
        fields = [
            'id', 'user', 'user_email', 'user_wallet', 'user_name',
            'trader_id', 'trader_name', 'token_symbol', 'allocated_usd',
            'base_currency', 'base_amount_deducted', 'token_amount_bought',
            'entry_price_usd', 'is_locked', 'status', 'created_at', 'closed_at'
        ]


class SupportMessageSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import SupportMessage
        model = SupportMessage
        fields = [
            'id', 'ticket', 'sender_type', 'sender_name',
            'message', 'attachment_url', 'created_at'
        ]


class SupportTicketSerializer(serializers.ModelSerializer):
    messages = SupportMessageSerializer(many=True, read_only=True)
    assigned_junior_admin_name = serializers.CharField(source='assigned_junior_admin.name', read_only=True)
    assigned_junior_admin_slug = serializers.CharField(source='assigned_junior_admin.slug', read_only=True)

    class Meta:
        from .models import SupportTicket
        model = SupportTicket
        fields = [
            'id', 'ticket_number', 'user', 'user_identifier', 'user_handle',
            'user_email', 'subject', 'category', 'message', 'screenshot_url',
            'status', 'priority', 'assigned_junior_admin', 'assigned_junior_admin_name',
            'assigned_junior_admin_slug', 'admin_notes', 'created_at', 'updated_at',
            'messages'
        ]


class AppNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        from .models import AppNotification
        model = AppNotification
        fields = [
            'id', 'target_audience', 'user', 'user_identifier', 'title',
            'message', 'notification_type', 'link_url', 'is_read', 'created_at'
        ]


