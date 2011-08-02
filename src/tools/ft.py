# encoding: utf-8

'''
Fustion tables command line client
original author: kbrisbin
'''

from fusiontables.authorization.clientlogin import ClientLogin
from fusiontables.sql.sqlbuilder import SQL
from fusiontables import ftclient
from cmd import Cmd
import sys
import getpass
import urllib2


class FTCmd(Cmd):
    def __init__(self, client):
        Cmd.__init__(self)
        self.client = client

    def default(self, line):
        try:
            rowid = self.client.query(line)
            print rowid
        except urllib2.HTTPError as e:
            print "ERROR: %s" % e.msg


if __name__ == "__main__":
    username = raw_input("Enter your google id: ")
    password = getpass.getpass("Enter your password: ")
    token = ClientLogin().authorize(username, password)
    ft_client = ftclient.ClientLoginFTClient(token)
    FTCmd(ft_client).cmdloop()

