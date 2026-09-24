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
    admin_pin = models.CharField(max_length=64, default='admin123')
    trading_fee_pct = models.DecimalField(max_digits=5, decimal_places=2, default=1.0)
    is_trading_paused = models.BooleanField(default=False)
    usd_rate = models.DecimalField(max_digits=12, decimal_places=2, default=1600.0)
    swiftsats_url = models.CharField(max_length=255, default='http://localhost:5173')
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Platform Settings (Fee: {self.trading_fee_pct}%, Rate: ₦{self.usd_rate})"

