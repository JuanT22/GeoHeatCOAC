"""Configuración de GeoHeat COAC. Todo valor sensible se lee desde backend/.env."""
import os
from datetime import timedelta
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')


def env_obligatoria(nombre):
    valor = os.getenv(nombre)
    if not valor:
        raise ImproperlyConfigured(f'Falta la variable {nombre}; revisa backend/.env (plantilla: .env.example).')
    return valor


def env_lista(nombre):
    return [v.strip() for v in os.getenv(nombre, '').split(',') if v.strip()]


SECRET_KEY = env_obligatoria('SECRET_KEY')
DEBUG = os.getenv('DEBUG', 'False').strip().lower() in ('1', 'true', 'yes', 'si')
ALLOWED_HOSTS = env_lista('ALLOWED_HOSTS')
CORS_ALLOWED_ORIGINS = env_lista('CORS_ALLOWED_ORIGINS')

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'corsheaders',
    'rest_framework',
    'django_filters',
    'drf_spectacular',
    'geoheat',
]

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

ROOT_URLCONF = 'config.urls'
WSGI_APPLICATION = 'config.wsgi.application'

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

DB_ENGINE = env_obligatoria('DB_ENGINE')
DATABASES = {
    'default': {
        'ENGINE': DB_ENGINE,
        'NAME': env_obligatoria('DB_NAME'),
        'USER': os.getenv('DB_USER', ''),
        'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', ''),
        'PORT': os.getenv('DB_PORT', ''),
    }
}
if DB_ENGINE.endswith('mysql'):
    DATABASES['default']['OPTIONS'] = {
        'charset': 'utf8mb4',
        'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
    }
    DATABASES['default']['TEST'] = {'CHARSET': 'utf8mb4'}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': f'django.contrib.auth.password_validation.{nombre}'}
    for nombre in ('UserAttributeSimilarityValidator', 'MinimumLengthValidator',
                   'CommonPasswordValidator', 'NumericPasswordValidator')
]

LANGUAGE_CODE = 'es'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Cargas CSV enviadas como texto (RF-003); coincide con el máximo para archivos.
DATA_UPLOAD_MAX_MEMORY_SIZE = 20 * 1024 * 1024

MAILERS = {'default': {'BACKEND': 'django.core.mail.backends.console.EmailBackend'}}

REST_FRAMEWORK = {
    # Los ViewSets quedan en AllowAny para la demo. Se omite BasicAuthentication a propósito:
    # permitiría probar contraseñas sin pasar por el bloqueo de /api/auth/login/.
    'DEFAULT_PERMISSION_CLASSES': ['rest_framework.permissions.AllowAny'],
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    # Montos y coordenadas viajan como números JSON (no como texto).
    'COERCE_DECIMAL_TO_STRING': False,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),  # una jornada laboral
    'CHECK_REVOKE_TOKEN': True,  # cambiar la contraseña invalida los tokens emitidos
}

# Clave inicial de los usuarios de prueba; si falta, se crean sin contraseña utilizable.
DEMO_USERS_PASSWORD = os.getenv('DEMO_USERS_PASSWORD', '')

SPECTACULAR_SETTINGS = {
    'TITLE': 'GeoHeat COAC API',
    'DESCRIPTION': (
        'API REST del Dashboard Geoespacial Predictivo para Microzonas Comerciales – '
        'COAC Padre Julián Lorente.'
    ),
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'ENUM_NAME_OVERRIDES': {'Cuadrante2x2Enum': 'geoheat.models.Cuadrante2x2'},
}
