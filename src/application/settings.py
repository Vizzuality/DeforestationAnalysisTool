"""
settings.py

Configuration for Flask app

Important: Place your keys in the secret_keys.py module, 
           which should be kept out of version control.

"""

import os

from secret_keys import *


DEBUG_MODE = False

# Auto-set debug mode based on App Engine dev environ
if 'SERVER_SOFTWARE' in os.environ and os.environ['SERVER_SOFTWARE'].startswith('Dev'):
    DEBUG_MODE = True

DEBUG = DEBUG_MODE

if 1 or DEBUG:
    FT_TABLE = 'areas_dev'
    FT_TABLE_ID = '1556991'
else:
    FT_TABLE = 'areas'
    FT_TABLE_ID = '1089491'

# Set secret keys for CSRF protection
SECRET_KEY = CSRF_SECRET_KEY
CSRF_SESSION_KEY = SESSION_KEY

CSRF_ENABLED = True

