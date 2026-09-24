from django.urls import path
from . import views

urlpatterns = [
    # ─── New Secure Auth System ───────────────────────────────────────────
    path('auth/signup/',                views.auth_signup,              name='auth_signup'),
    path('auth/verify-email/',          views.auth_verify_email,        name='auth_verify_email'),
    path('auth/resend-verification/',   views.auth_resend_verification, name='auth_resend_verification'),
    path('auth/login/',                 views.auth_login,               name='auth_login'),
    path('auth/logout/',                views.auth_logout,              name='auth_logout'),
    path('auth/refresh/',               views.auth_refresh_token,       name='auth_refresh'),
    path('auth/me/',                    views.auth_me,                  name='auth_me'),
    path('auth/forgot-password/',       views.auth_forgot_password,     name='auth_forgot_password'),
    path('auth/reset-password/',        views.auth_reset_password,      name='auth_reset_password'),
    path('auth/change-password/',       views.auth_change_password,     name='auth_change_password'),

    # ─── Legacy Seed-Phrase Auth (kept for backward compat) ──────────────
    path('auth/generate-seed/',         views.generate_seed_phrase,     name='generate_seed'),
    path('auth/register-wallet/',       views.register_wallet,          name='register_wallet'),
    path('auth/unlock/',                views.unlock_wallet,            name='unlock_wallet'),

    # ─── Portfolio & Balances ─────────────────────────────────────────────
    path('wallet/portfolio/',           views.get_portfolio,            name='get_portfolio'),
    path('wallet/deposit-address/',     views.get_deposit_address,      name='deposit_address'),
    path('wallet/deposit-wallets/',     views.get_deposit_wallets,      name='deposit_wallets'),
    path('wallet/verify-deposit/',      views.verify_onchain_deposit,   name='verify_deposit'),
    path('wallet/swiftsats-credit/',    views.swiftsats_order_credit,   name='swiftsats_order_credit'),
    path('webhooks/swiftsats/',         views.swiftsats_webhook,        name='swiftsats_webhook'),
    path('wallet/faucet-deposit/',          views.faucet_deposit,               name='faucet_deposit'),
    path('wallet/sync-balances/',           views.sync_user_balances,           name='sync_balances'),
    path('wallet/request-withdrawal/',      views.request_withdrawal,           name='request_withdrawal'),
    path('wallet/withdrawal-eligibility/',  views.check_withdrawal_eligibility, name='withdrawal_eligibility'),
    path('wallet/withdrawals/',             views.get_user_withdrawals,        name='user_withdrawals'),

    # ─── Trading & Meme Coins ─────────────────────────────────────────────
    path('tokens/',                     views.list_meme_tokens,         name='list_tokens'),
    path('tokens/<str:symbol>/',        views.get_token_details,        name='token_details'),
    path('trade/buy/',                  views.buy_token,                name='buy_token'),
    path('trade/sell/',                 views.sell_token,               name='sell_token'),
    path('trade/recent/',               views.get_recent_trades,        name='recent_trades'),

    # ─── Token Swapper ────────────────────────────────────────────────────
    path('swap/quote/',                 views.swap_quote,               name='swap_quote'),
    path('swap/execute/',               views.swap_execute,             name='swap_execute'),

    # ─── Admin Control Suite ──────────────────────────────────────────────
    path('admin-api/login/',                            views.admin_login,                name='admin_login'),
    path('admin-api/metrics/',                          views.admin_metrics,              name='admin_metrics'),
    path('admin-api/withdrawals/',                      views.admin_withdrawals_list,     name='admin_withdrawals'),
    path('admin-api/withdrawals/<int:pk>/approve/',     views.admin_approve_withdrawal,   name='admin_approve_wd'),
    path('admin-api/withdrawals/<int:pk>/reject/',      views.admin_reject_withdrawal,    name='admin_reject_wd'),
    path('admin-api/tokens/create/',                    views.admin_create_token,         name='admin_create_token'),
    path('admin-api/tokens/<str:symbol>/control/',      views.admin_control_token,        name='admin_control_token'),
    path('admin-api/deposit-wallets/',                  views.admin_deposit_wallets,      name='admin_deposit_wallets'),
    path('admin-api/trades/',                           views.admin_trades_list,          name='admin_trades_list'),
    path('admin-api/users/',                            views.admin_users_list,           name='admin_users_list'),
    path('admin-api/deposits/',                         views.admin_deposits_list,        name='admin_deposits_list'),
    path('admin-api/junior-admins/',                    views.admin_junior_admins_list,   name='admin_junior_admins'),
    path('admin-api/junior-admins/<uuid:pk>/',          views.admin_junior_admin_detail,  name='admin_junior_admin_detail'),
    path('platform/settings/',                          views.platform_settings_view,     name='platform_settings'),

    # ─── Junior Admin Dedicated Suite ──────────────────────────────────────
    path('junior-admin/login/',                         views.junior_admin_login,               name='ja_login'),
    path('junior-admin/metrics/',                       views.junior_admin_metrics,             name='ja_metrics'),
    path('junior-admin/users/',                         views.junior_admin_users,               name='ja_users'),
    path('junior-admin/deposits/',                      views.junior_admin_deposits,            name='ja_deposits'),
    path('junior-admin/withdrawals/',                   views.junior_admin_withdrawals,         name='ja_withdrawals'),
    path('junior-admin/withdrawals/<int:pk>/approve/',  views.junior_admin_approve_withdrawal,  name='ja_approve_withdrawal'),
    path('junior-admin/withdrawals/<int:pk>/reject/',   views.junior_admin_reject_withdrawal,   name='ja_reject_withdrawal'),
]

