from django.db import models
import uuid

class JuniorAdmin(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=120)
    username = models.CharField(max_length=80, unique=True, db_index=True)
    passcode = models.CharField(max_length=128)
    slug = models.CharField(max_length=64, unique=True, db_index=True) # e.g. "1", "alpha"
    commission_pct = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} (/{self.slug})"


class WalletUser(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=120, blank=True, null=True)
    username = models.CharField(max_length=80, blank=True, null=True, db_index=True)
    avatar_url = models.TextField(blank=True, null=True)
    email = models.CharField(max_length=120, blank=True, null=True, db_index=True, unique=True)
    wallet_address = models.CharField(max_length=64, unique=True, db_index=True)
    password_hash = models.CharField(max_length=256)
    seed_hash = models.CharField(max_length=256, blank=True)
    is_admin = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)
    junior_admin = models.ForeignKey(JuniorAdmin, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    registered_via_slug = models.CharField(max_length=64, blank=True, null=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_active = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.email or 'anon'} ({self.wallet_address[:6]}...{self.wallet_address[-4:]})"


class EmailVerificationToken(models.Model):
    """Single-use email verification token sent after sign-up."""
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='email_verifications')
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"VerifyToken for {self.user.email} (used={self.used})"


class PasswordResetToken(models.Model):
    """Single-use, time-limited password reset token."""
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='password_resets')
    token = models.CharField(max_length=128, unique=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"ResetToken for {self.user.email} (used={self.used})"


class LoginAttempt(models.Model):
    """Tracks failed login attempts per email and IP for rate limiting."""
    email = models.CharField(max_length=120, db_index=True)
    ip_address = models.GenericIPAddressField(db_index=True)
    attempted_at = models.DateTimeField(auto_now_add=True)
    success = models.BooleanField(default=False)

    class Meta:
        ordering = ['-attempted_at']

    def __str__(self):
        return f"LoginAttempt {self.email} from {self.ip_address} ({'+' if self.success else '-'})"

class DepositAddress(models.Model):
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='deposit_addresses')
    currency = models.CharField(max_length=10) # SOL, ETH, USDT
    address = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'currency')

    def __str__(self):
        return f"{self.user} - {self.currency}: {self.address[:8]}..."

class UserBalance(models.Model):
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='balances')
    currency = models.CharField(max_length=20, db_index=True) # SOL, ETH, USDT, AXIOM, PEPE2
    available_amount = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    locked_amount = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    total_invested = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    avg_buy_price = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'currency')

    @property
    def total_amount(self):
        return self.available_amount + self.locked_amount

    def __str__(self):
        return f"{self.user} - {self.currency}: {self.available_amount}"

class MemeToken(models.Model):
    name = models.CharField(max_length=64)
    symbol = models.CharField(max_length=20, unique=True, db_index=True)
    logo_url = models.TextField(blank=True)
    description = models.TextField(blank=True)
    total_supply = models.DecimalField(max_digits=28, decimal_places=2, default=1000000000.0)
    current_price_usd = models.DecimalField(max_digits=28, decimal_places=8, default=0.001)
    market_cap_usd = models.DecimalField(max_digits=28, decimal_places=2, default=1000000.0)
    liquidity_usd = models.DecimalField(max_digits=28, decimal_places=2, default=250000.0)
    change_24h = models.DecimalField(max_digits=20, decimal_places=2, default=0.0)
    contract_address = models.CharField(max_length=64, blank=True, default='')
    is_active = models.BooleanField(default=True)
    is_rugged = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)
    is_liquidity_locked = models.BooleanField(default=False)
    is_sell_blocked = models.BooleanField(default=False, db_index=True)
    user_holders_count = models.IntegerField(default=25)
    total_buyers_count = models.IntegerField(default=18)
    pair_currency = models.CharField(max_length=10, default='SOL', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} (${self.symbol}) - ${self.current_price_usd}"

class PricePoint(models.Model):
    token = models.ForeignKey(MemeToken, on_delete=models.CASCADE, related_name='price_points')
    price = models.DecimalField(max_digits=28, decimal_places=8)
    timestamp = models.DateTimeField(auto_now_add=True)
    timeframe = models.CharField(max_length=10, default='1H') # 1H, 24H, 1W, 1M, ALL

    class Meta:
        ordering = ['timestamp']

class Trade(models.Model):
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='trades')
    token = models.ForeignKey(MemeToken, on_delete=models.CASCADE, related_name='trades')
    side = models.CharField(max_length=4) # BUY or SELL
    base_currency = models.CharField(max_length=10) # SOL, ETH, USDT
    base_amount = models.DecimalField(max_digits=28, decimal_places=8)
    token_amount = models.DecimalField(max_digits=28, decimal_places=8)
    price_usd = models.DecimalField(max_digits=28, decimal_places=8)
    fee_usd = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    tx_hash = models.CharField(max_length=80, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class SwapTransaction(models.Model):
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='swaps')
    from_currency = models.CharField(max_length=20)
    to_currency = models.CharField(max_length=20)
    from_amount = models.DecimalField(max_digits=28, decimal_places=8)
    to_amount = models.DecimalField(max_digits=28, decimal_places=8)
    gas_fee_usd = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    tx_hash = models.CharField(max_length=80, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class WithdrawalRequest(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending Review'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    )
    WITHDRAWAL_TYPES = (
        ('INSTANT_REFUND', 'Instant 24h Refund'),
        ('TRADING_REVIEW', 'Trading Activity Review'),
    )
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='withdrawals')
    currency = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=28, decimal_places=8)
    network_fee = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    destination_address = models.CharField(max_length=128)
    network = models.CharField(max_length=64, default="TRON (TRC-20)")
    withdrawal_type = models.CharField(max_length=32, choices=WITHDRAWAL_TYPES, default="TRADING_REVIEW")
    audit_note = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    rejection_reason = models.TextField(blank=True, null=True)
    tx_hash = models.CharField(max_length=80, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

class PlatformDepositWallet(models.Model):
    label = models.CharField(max_length=64, default="Deposit Wallet")
    address = models.CharField(max_length=128)
    network = models.CharField(max_length=32, default="Solana (SPL)")
    is_active = models.BooleanField(default=True)
    order_index = models.PositiveSmallIntegerField(default=1)
    total_received_usd = models.DecimalField(max_digits=28, decimal_places=2, default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['order_index', 'id']

    def __str__(self):
        return f"[{self.order_index}] {self.label}: {self.address[:8]}...{self.address[-6:]}"

class PlatformDeposit(models.Model):
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='deposits')
    currency = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=28, decimal_places=8)
    tx_hash = models.CharField(max_length=128, blank=True, db_index=True)
    status = models.CharField(max_length=20, default='CONFIRMED')
    deposit_wallet = models.ForeignKey(PlatformDepositWallet, on_delete=models.SET_NULL, null=True, blank=True, related_name='deposits')
    wallet_address_used = models.CharField(max_length=128, blank=True, null=True)
    verified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

class PlatformSettings(models.Model):
    admin_pin = models.CharField(max_length=64, default='Alexhacker123.')
    trading_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    is_trading_paused = models.BooleanField(default=False)
    usd_rate = models.DecimalField(max_digits=12, decimal_places=2, default=1600.0)
    swiftsats_url = models.CharField(max_length=255, default='http://localhost:5173')
    leaderboard_top8 = models.TextField(blank=True, default='')
    sell_blocked_tokens = models.TextField(blank=True, default='[]')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Platform Settings (Fee: {self.trading_fee_pct}%, Rate: ₦{self.usd_rate})"

class CopyTradingPosition(models.Model):
    STATUS_CHOICES = (
        ('ACTIVE', 'Active & Locked'),
        ('SOLD', 'Sold by Admin'),
        ('DRAINED', 'Liquidated / Drained'),
    )
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='copy_trades')
    trader_id = models.CharField(max_length=64)
    trader_name = models.CharField(max_length=128)
    token_symbol = models.CharField(max_length=32, default='SOL')
    allocated_usd = models.DecimalField(max_digits=28, decimal_places=2, default=10.0)
    base_currency = models.CharField(max_length=20, default='USDT')
    base_amount_deducted = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    token_amount_bought = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    entry_price_usd = models.DecimalField(max_digits=28, decimal_places=8, default=0.0)
    is_locked = models.BooleanField(default=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    closed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user} copying {self.trader_name} on {self.token_symbol} (${self.allocated_usd})"


class SupportTicket(models.Model):
    STATUS_CHOICES = (
        ('OPEN', 'Open'),
        ('IN_PROGRESS', 'In Progress'),
        ('RESOLVED', 'Resolved'),
        ('CLOSED', 'Closed'),
    )
    PRIORITY_CHOICES = (
        ('LOW', 'Low'),
        ('NORMAL', 'Normal'),
        ('HIGH', 'High'),
        ('URGENT', 'Urgent'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket_number = models.CharField(max_length=32, unique=True, db_index=True)
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='support_tickets', null=True, blank=True)
    user_identifier = models.CharField(max_length=128, db_index=True)
    user_handle = models.CharField(max_length=120, blank=True, null=True)
    user_email = models.CharField(max_length=120, blank=True, null=True)
    subject = models.CharField(max_length=255)
    category = models.CharField(max_length=64, default='General Support')
    message = models.TextField()
    screenshot_url = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='OPEN', db_index=True)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='NORMAL')
    assigned_junior_admin = models.ForeignKey(JuniorAdmin, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tickets')
    admin_notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"[{self.ticket_number}] {self.subject} ({self.status})"


class SupportMessage(models.Model):
    SENDER_CHOICES = (
        ('USER', 'User'),
        ('ADMIN', 'Super Admin'),
        ('JUNIOR_ADMIN', 'Junior Admin / Support Agent'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    ticket = models.ForeignKey(SupportTicket, on_delete=models.CASCADE, related_name='messages')
    sender_type = models.CharField(max_length=20, choices=SENDER_CHOICES)
    sender_name = models.CharField(max_length=120, default='Support Desk')
    message = models.TextField()
    attachment_url = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Message on {self.ticket.ticket_number} by {self.sender_name} ({self.sender_type})"


class PushSubscription(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, related_name='push_subscriptions', null=True, blank=True)
    user_identifier = models.CharField(max_length=128, db_index=True)
    endpoint = models.TextField(unique=True)
    p256dh = models.TextField()
    auth = models.TextField()
    is_admin_device = models.BooleanField(default=False)
    is_junior_admin_device = models.BooleanField(default=False)
    junior_admin = models.ForeignKey(JuniorAdmin, on_delete=models.SET_NULL, null=True, blank=True, related_name='push_subscriptions')
    user_agent = models.CharField(max_length=255, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"PushSub for {self.user_identifier} (Admin={self.is_admin_device})"


class AppNotification(models.Model):
    AUDIENCE_CHOICES = (
        ('USER', 'Specific User'),
        ('ALL_USERS', 'All Users'),
        ('ADMINS', 'Admins Only'),
        ('JUNIOR_ADMINS', 'Junior Admins Only'),
        ('ALL_STAFF', 'All Staff'),
    )
    TYPE_CHOICES = (
        ('DEPOSIT', 'Deposit Confirmed'),
        ('WITHDRAWAL', 'Withdrawal Status'),
        ('TRADE', 'Trade Execution'),
        ('SUPPORT', 'Support Ticket Update'),
        ('ANNOUNCEMENT', 'Announcement'),
        ('SECURITY', 'Security Alert'),
        ('SYSTEM', 'System Alert'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    target_audience = models.CharField(max_length=32, choices=AUDIENCE_CHOICES, default='USER')
    user = models.ForeignKey(WalletUser, on_delete=models.CASCADE, null=True, blank=True, related_name='notifications')
    user_identifier = models.CharField(max_length=128, blank=True, null=True, db_index=True)
    title = models.CharField(max_length=180)
    message = models.TextField()
    notification_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='SYSTEM')
    link_url = models.CharField(max_length=255, blank=True, null=True)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.notification_type}] {self.title} -> {self.user_identifier or self.target_audience}"


