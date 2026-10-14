import os
from django.core.management.base import BaseCommand
from django.core.cache import cache
from decimal import Decimal
from wallet_engine.models import (
    WalletUser, WithdrawalRequest, PlatformDeposit, Trade,
    SwapTransaction, UserBalance, EmailVerificationToken,
    PasswordResetToken, LoginAttempt, AppNotification,
    PlatformDepositWallet
)

class Command(BaseCommand):
    help = 'Purges all test users, deposits, withdrawals, trades, and balances while preserving super admin accounts and deposit wallets.'

    def handle(self, *args, **options):
        self.stdout.write("Cleaning platform data to start afresh...")

        w_count, _ = WithdrawalRequest.objects.all().delete()
        d_count, _ = PlatformDeposit.objects.all().delete()
        t_count, _ = Trade.objects.all().delete()
        s_count, _ = SwapTransaction.objects.all().delete()
        b_count, _ = UserBalance.objects.all().delete()
        n_count, _ = AppNotification.objects.all().delete()
        ev_count, _ = EmailVerificationToken.objects.all().delete()
        pr_count, _ = PasswordResetToken.objects.all().delete()
        la_count, _ = LoginAttempt.objects.all().delete()

        # Delete all non-admin users, keeping super admin intact
        non_admin_users = WalletUser.objects.filter(is_admin=False)
        u_count = non_admin_users.count()
        non_admin_users.delete()

        # Reset deposit wallets total_received_usd to 0.00
        PlatformDepositWallet.objects.update(total_received_usd=Decimal('0.00'))

        # Clear cached metrics
        cache.clear()

        self.stdout.write(self.style.SUCCESS(
            f"Successfully reset platform!\n"
            f"- Deleted {u_count} test users (preserved Super Admin)\n"
            f"- Deleted {w_count} withdrawal requests\n"
            f"- Deleted {d_count} deposit records\n"
            f"- Deleted {t_count} trades & {s_count} swaps\n"
            f"- Deleted {b_count} user balances\n"
            f"- Deleted {n_count} notifications\n"
            f"- Reset deposit wallets total received to $0.00\n"
            f"- Flushed cache. Platform is ready to start afresh!"
        ))
