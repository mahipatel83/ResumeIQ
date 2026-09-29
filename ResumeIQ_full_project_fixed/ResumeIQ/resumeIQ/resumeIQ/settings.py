import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent


# =========================================================
# SECURITY
# =========================================================

# IMPORTANT:
# Set SECRET_KEY in Render Environment Variables.
# For local development, you can use a local value.
SECRET_KEY = os.environ.get(
    "SECRET_KEY",
    "django-insecure-change-this-local-secret-key"
)

DEBUG = True

ALLOWED_HOSTS = [
    "resumeiq-myproject.onrender.com",
    "127.0.0.1",
    "localhost",
]


# =========================================================
# APPLICATIONS
# =========================================================

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    'corsheaders',

    'LandingPage',
    'recruiter',
    'candidate',
    'accounts',
    'superadmin',
]


# =========================================================
# MIDDLEWARE
# =========================================================

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',

    'corsheaders.middleware.CorsMiddleware',

    'django.contrib.sessions.middleware.SessionMiddleware',

    'django.middleware.common.CommonMiddleware',

    'django.middleware.csrf.CsrfViewMiddleware',

    'django.contrib.auth.middleware.AuthenticationMiddleware',

    'django.contrib.messages.middleware.MessageMiddleware',

    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]


# =========================================================
# CORS
# =========================================================

CORS_ALLOWED_ORIGINS = [
    "https://resume-iq-steel.vercel.app",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True


# =========================================================
# CSRF
# =========================================================

CSRF_TRUSTED_ORIGINS = [
    "https://resume-iq-steel.vercel.app",
]


# =========================================================
# URL / WSGI
# =========================================================

ROOT_URLCONF = 'resumeIQ.urls'

WSGI_APPLICATION = 'resumeIQ.wsgi.application'


# =========================================================
# TEMPLATES
# =========================================================

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


# =========================================================
# DATABASE
# =========================================================

# MongoDB is used by your application data.
# Django's SQLite database is still used for Django sessions.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# =========================================================
# PASSWORD VALIDATION
# =========================================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# =========================================================
# SESSION / COOKIE SETTINGS
# =========================================================

SESSION_COOKIE_SECURE = True
SESSION_COOKIE_SAMESITE = "None"

CSRF_COOKIE_SECURE = True
CSRF_COOKIE_SAMESITE = "None"

CSRF_TRUSTED_ORIGINS = [
    "https://resume-iq-steel.vercel.app",
]


# =========================================================
# LANGUAGE / TIME
# =========================================================

LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_TZ = True


# =========================================================
# STATIC FILES
# =========================================================

STATIC_URL = 'static/'


# =========================================================
# MEDIA FILES
# =========================================================

MEDIA_URL = 'media/'

MEDIA_ROOT = BASE_DIR / 'media'


# =========================================================
# SECURITY HEADERS
# =========================================================

X_FRAME_OPTIONS = 'SAMEORIGIN'


# =========================================================
# EMAIL
# =========================================================

EMAIL_BACKEND = os.environ.get(
    'EMAIL_BACKEND',
    'django.core.mail.backends.console.EmailBackend'
)

EMAIL_HOST = os.environ.get(
    'EMAIL_HOST',
    'smtp.gmail.com'
)

EMAIL_PORT = int(
    os.environ.get(
        'EMAIL_PORT',
        587
    )
)

EMAIL_USE_TLS = os.environ.get(
    'EMAIL_USE_TLS',
    'True'
) == 'True'

EMAIL_HOST_USER = os.environ.get(
    'EMAIL_HOST_USER',
    ''
)

EMAIL_HOST_PASSWORD = os.environ.get(
    'EMAIL_HOST_PASSWORD',
    ''
)

DEFAULT_FROM_EMAIL = os.environ.get(
    'DEFAULT_FROM_EMAIL',
    EMAIL_HOST_USER or 'no-reply@resumeiq.local'
)
