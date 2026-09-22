"""
Django settings for axiom_core project.
"""

from pathlib import Path
import os

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# SECURITY WARNING: keep the secret key used in production secret!
# In production, load from environment variable.
SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-x5j&_qh@j_rcc%!44cg^&$v5&ywd)@43+_qj%m*)3q(dl_911='
)

# In production, DJANGO_DEBUG=False by default unless explicitly enabled
DEBUG = os.environ.get('DJANGO_DEBUG', 'False').lower() in ('true', '1')

ALLOWED_HOSTS = ['*']

# ─────────────────────────────────────────────
# JWT Configuration
# ─────────────────────────────────────────────
JWT_SECRET = os.environ.get('JWT_SECRET', SECRET_KEY)
JWT_ACCESS_TOKEN_LIFETIME_MINUTES = 60          # 1 hour
JWT_REFRESH_TOKEN_LIFETIME_DAYS = 7             # 7 days (extended if "Remember Me")
JWT_REMEMBER_ME_LIFETIME_DAYS = 30              # 30 days for remember-me sessions
JWT_ALGORITHM = 'HS256'

# ─────────────────────────────────────────────
# Email / SMTP (stub — configure for production)
# ─────────────────────────────────────────────
# TODO: Replace with real SMTP credentials for production email delivery.
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
# EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
# EMAIL_HOST = 'smtp.sendgrid.net'
# EMAIL_PORT = 587
# EMAIL_USE_TLS = True
# EMAIL_HOST_USER = 'apikey'
# EMAIL_HOST_PASSWORD = os.environ.get('SENDGRID_API_KEY', '')
DEFAULT_FROM_EMAIL = 'noreply@axiomwallet.io'
FRONTEND_BASE_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')

# ─────────────────────────────────────────────
# Rate Limiting (per-email/IP login attempts)
# ─────────────────────────────────────────────
LOGIN_MAX_ATTEMPTS = 5          # max failed attempts before lockout
LOGIN_LOCKOUT_MINUTES = 15      # how long the lockout lasts
SIGNUP_RATE_LIMIT_HOUR = 10     # max sign-ups per IP per hour

# Application definition
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'wallet_engine',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_ALL_ORIGINS = False
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://.*\.onrender\.com$",
    r"^http://localhost:\d+$",
    r"^http://127\.0\.0\.1:\d+$",
]
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

CSRF_TRUSTED_ORIGINS = [
    'https://*.onrender.com',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
]

if FRONTEND_BASE_URL:
    clean_fe = FRONTEND_BASE_URL.rstrip('/')
    if clean_fe not in CSRF_TRUSTED_ORIGINS:
        CSRF_TRUSTED_ORIGINS.append(clean_fe)
    if clean_fe not in CORS_ALLOWED_ORIGINS:
        CORS_ALLOWED_ORIGINS.append(clean_fe)

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
        'rest_framework.renderers.BrowsableAPIRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.FormParser',
        'rest_framework.parsers.MultiPartParser',
    ],
}

ROOT_URLCONF = 'axiom_core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'axiom_core.wsgi.application'

from urllib.parse import urlparse

# Database — PostgreSQL on Render (falls back to local SQLite if DATABASE_URL unset)
DATABASE_URL = os.environ.get(
    'DATABASE_URL',
    'postgresql://axiomdb_0iwa_user:woiJxKHDSJv0xkZC1VS53BTN5M40fTAN@dpg-dap8k5id0e5s73f3gvqg-a.oregon-postgres.render.com/axiomdb_0iwa'
)

if DATABASE_URL:
    db_url = urlparse(DATABASE_URL)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.postgresql',
            'NAME': db_url.path[1:],
            'USER': db_url.username,
            'PASSWORD': db_url.password,
            'HOST': db_url.hostname,
            'PORT': db_url.port or 5432,
            'OPTIONS': {
                'sslmode': 'require',
            } if db_url.hostname and ('render.com' in db_url.hostname or 'dpg-' in db_url.hostname) else {},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }

# ─────────────────────────────────────────────
# Cookie / Session Security
# ─────────────────────────────────────────────
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'
SESSION_COOKIE_SECURE = not DEBUG  # True in production (HTTPS)

# CSRF
CSRF_COOKIE_HTTPONLY = False  # Must be readable by JS for SPA CSRF flow
CSRF_COOKIE_SAMESITE = 'None' if not DEBUG else 'Lax'
CSRF_COOKIE_SECURE = not DEBUG

# ─────────────────────────────────────────────
# Security Headers
# ─────────────────────────────────────────────
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_BROWSER_XSS_FILTER = True

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# Internationalization
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# Static files
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'
