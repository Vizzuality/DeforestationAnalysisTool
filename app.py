#!/usr/bin/env python

import functools
import os.path
import re
import tornado.escape
import tornado.options
import tornado.web
import tornado.wsgi
import unicodedata
import wsgiref.handlers

from google.appengine.api import users


class BaseHandler(tornado.web.RequestHandler):
    def get_current_user(self):
        u = users.get_current_user()
        return u


class HomeHandler(BaseHandler):
    def get(self):
        if self.get_current_user():
            self.render("home.html")
        else:
            self.redirect(users.create_login_url(self.request.uri))


settings = {
    "static_path": os.path.join(os.path.dirname(__file__), "static"),
    "template_path": os.path.join(os.path.dirname(__file__), "templates"),
    #"ui_modules": {"Entry": EntryModule},
    "xsrf_cookies": True,
    "autoescape": None,
    'cookie_secret':"32oETzKXQAGaYdkL5gEmGeJJFuYh7EQnp2XdTP1o/Vo=",
    'login_url':"/auth/login",
    'debug': True,
}

application = tornado.wsgi.WSGIApplication([
    (r"/", HomeHandler),
], **settings)

def main():
    wsgiref.handlers.CGIHandler().run(application)


if __name__ == "__main__":
    main()
