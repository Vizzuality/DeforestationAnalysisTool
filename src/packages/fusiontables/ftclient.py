#!/usr/bin/python
#
# Copyright (C) 2010 Google Inc.

""" Fusion Tables Client.

Issue requests to Fusion Tables.
"""

__author__ = 'kbrisbin@google.com (Kathryn Brisbin)'

import urllib2, urllib
try:
  import oauth2
  import authorization.oauth
except: pass


class FTClient():
  def _get(self, query): pass
  def _post(self, query): pass

  def query(self, query, request_type=None):
    """ Issue a query to the Fusion Tables API and return the result. """

    #encode to UTF-8
    try: query = query.encode("utf-8")
    except: query = query.decode('raw_unicode_escape').encode("utf-8")

    lowercase_query = query.lower()
    if lowercase_query.startswith("select") or \
       lowercase_query.startswith("describe") or \
       lowercase_query.startswith("show") or \
       request_type=="GET":

      return self._get(urllib.urlencode({'sql': query}))

    else:
      return self._post(urllib.urlencode({'sql': query}))


class ClientLoginFTClient(FTClient):

  def __init__(self, token):
    self.auth_token = token
    self.request_url = "https://www.google.com/fusiontables/api/query"

  def _get(self, query):
    headers = {
      'Authorization': 'GoogleLogin auth=' + self.auth_token,
    }
    serv_req = urllib2.Request(url="%s?%s" % (self.request_url, query),
                               headers=headers)
    serv_resp = urllib2.urlopen(serv_req)
    return serv_resp.read()

  def _post(self, query):
    headers = {
      'Authorization': 'GoogleLogin auth=' + self.auth_token,
      'Content-Type': 'application/x-www-form-urlencoded',
    }

    serv_req = urllib2.Request(url=self.request_url, data=query, headers=headers)
    serv_resp = urllib2.urlopen(serv_req)
    return serv_resp.read()


class OAuthFTClient(FTClient):

  def __init__(self, consumer_key, consumer_secret, oauth_token, oauth_token_secret):
    self.consumer_key = consumer_key
    self.consumer_secret = consumer_secret
    self.token = oauth2.Token(oauth_token, oauth_token_secret)
    
    self.scope = "https://www.google.com/fusiontables/api/query"


  def _get(self, query):
    consumer = oauth2.Consumer(self.consumer_key, self.consumer_secret)
    client = oauth2.Client(consumer, self.token)
    resp, content = client.request(uri="%s?%s" % (self.scope, query),
                         method="GET")
    return content


  def _post(self, query):
    consumer = oauth2.Consumer(self.consumer_key, self.consumer_secret)
    client = oauth2.Client(consumer, self.token)
    resp, content = client.request(uri=self.scope,
                                   method="POST",
                                   body=query)
    return content


  