#!/usr/bin/python
#
# Copyright (C) 2010 Google Inc.

""" ClientLogin.
"""

__author__ = 'kbrisbin@google.com (Kathryn Brisbin)'

import urllib, urllib2

class ClientLogin():
  def authorize(self, username, password):
    auth_uri = 'https://www.google.com/accounts/ClientLogin'
    authreq_data = urllib.urlencode({
        'Email': username,
        'Passwd': password,
        'service': 'gestalt',#,fusiontables',
        'accountType': 'GOOGLE'})
    auth_req = urllib2.Request(auth_uri, data=authreq_data)
    auth_resp = urllib2.urlopen(auth_req)
    auth_resp_body = auth_resp.read()

    auth_resp_dict = dict(
        x.split('=') for x in auth_resp_body.split('\n') if x)
    return auth_resp_dict['Auth']

import urllib2

def do_test(token):
    url = "https://earthengine.googleapis.com/api/list?id=MOD09GA&starttime=1254305000000&endtime=1256900200000"
    opener = urllib2.build_opener()
    opener.addheaders = [('Authorization', 'GoogleLogin auth=' + token)]
    print opener.open(url).read()
    
    
if __name__ == "__main__":

  import sys, getpass
  if len(sys.argv) == 2:
      username = sys.argv[1]
      password = getpass.getpass("Enter your password: ")
      
      token = ClientLogin().authorize(username, password)
      print token
  #do_test(token)
  else:
    print "usage: auth.py email"
