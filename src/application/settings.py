"""
settings.py

Configuration for Flask app

Important: Place your keys in the secret_keys.py module, 
           which should be kept out of version control.

"""

from google.appengine.api import app_identity
import os

from secret_keys import *


DEBUG_MODE = False

# Auto-set debug mode based on App Engine dev environ
if 'SERVER_SOFTWARE' in os.environ and os.environ['SERVER_SOFTWARE'].startswith('Dev'):
    DEBUG_MODE = True

DEBUG = DEBUG_MODE


if DEBUG:
    FT_TABLE = 'imazon_testing'
    FT_TABLE_ID = '2676501'
else:
    app_id  = app_identity.get_application_id()
    if app_id == 'imazon-sad-tool':
        FT_TABLE = 'areas'
        FT_TABLE_ID = '1089491'
    elif app_id == 'imazon-prototype':
        FT_TABLE = 'areas_testing'
        FT_TABLE_ID = '1869271'
    elif app_id == 'sad-training':
        FT_TABLE = 'areas_training'
        FT_TABLE_ID = '1898803'
    elif app_id == 'sad-ee':
        FT_TABLE = 'SAD EE Polygons'
        FT_TABLE_ID = '2949980'


# Set secret keys for CSRF protection
SECRET_KEY = CSRF_SECRET_KEY
CSRF_SESSION_KEY = SESSION_KEY

CSRF_ENABLED = True

