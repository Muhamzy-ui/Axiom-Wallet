from decimal import Decimal
from django.db import transaction
from django.core.exceptions import ValidationError
from ..models import UserBalance, WithdrawalRequest

@transaction.atomic
def get_or_create_balance(user, currency):
    balance, _ = UserBalance.objects.select_for_update().get_or_create(
        user=user,
        currency=currency.upper(),
        defaults={
            'available_amount': Decimal('0.0'),
            'locked_amount': Decimal('0.0'),
            'total_invested': Decimal('0.0'),
            'avg_buy_price': Decimal('0.0')
        }
    )
    return balance

@transaction.atomic
def credit_balance(user, currency, amount):
    amount_dec = Decimal(str(amount))
    balance = get_or_create_balance(user, currency)
    balance.available_amount += amount_dec
    balance.save()
    return balance

@transaction.atomic
def debit_balance(user, currency, amount):
    amount_dec = Decimal(str(amount))
    balance = get_or_create_balance(user, currency)
    if balance.available_amount < amount_dec:
        raise ValidationError(f"Insufficient {currency} balance. Available: {balance.available_amount}, requested: {amount_dec}")
    balance.available_amount -= amount_dec
    balance.save()
    return balance

@transaction.atomic
def lock_balance_for_withdrawal(user, currency, amount):
    amount_dec = Decimal(str(amount))
    balance = get_or_create_balance(user, currency)
    if balance.available_amount < amount_dec:
        raise ValidationError(f"Insufficient {currency} balance to withdraw. Available: {balance.available_amount}")
    balance.available_amount -= amount_dec
    balance.locked_amount += amount_dec
    balance.save()
    return balance

@transaction.atomic
def unlock_balance_from_rejection(user, currency, amount):
    amount_dec = Decimal(str(amount))
    balance = get_or_create_balance(user, currency)
    if balance.locked_amount < amount_dec:
        # Failsafe: if locked is somehow lower, return to available
        balance.available_amount += amount_dec
    else:
        balance.locked_amount -= amount_dec
        balance.available_amount += amount_dec
    balance.save()
    return balance

@transaction.atomic
def finalize_withdrawal(withdrawal: WithdrawalRequest, tx_hash=None):
    balance = get_or_create_balance(withdrawal.user, withdrawal.currency)
    amount_dec = Decimal(str(withdrawal.amount))
    if balance.locked_amount >= amount_dec:
        balance.locked_amount -= amount_dec
    balance.save()
    withdrawal.status = 'APPROVED'
    if tx_hash:
        withdrawal.tx_hash = tx_hash
    withdrawal.save()
    return withdrawal
