# encoding: utf-8

"""
this module contains some auth utility
"""

from functools import wraps
from google.appengine.api import users
from flask import redirect

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user = users.get_current_user()
        if not user:
            google_login_url = users.create_login_url(self.request.uri)
            return redirect(google_login_url)
        return f(*args, **kwargs)
    return decorated_function


