'''
Created on Dec 22, 2010

@author: kbrisbin
'''

from authorization.oauth import OAuth
from sql.sqlbuilder import SQL
import ftclient
from fileimport.fileimporter import CSVImporter


if __name__ == "__main__":
  import sys, getpass
  consumer_key = sys.argv[1]
  consumer_secret = getpass.getpass("Enter your secret: ")
  
  url, token, secret = OAuth().generateAuthorizationURL(consumer_key, consumer_secret, consumer_key)
  print "Visit this URL in a browser: ", url
  raw_input("Hit enter after authorization")
  
  token, secret = OAuth().authorize(consumer_key, consumer_secret, token, secret)
  oauth_client = ftclient.OAuthFTClient(consumer_key, consumer_secret, token, secret)

  #show tables
  results = oauth_client.query(SQL().showTables())
  print results
  
  #create a table
  table = {'tablename':{'strings':'STRING', 'numbers':'NUMBER', 'locations':'LOCATION'}}
  tableid = int(oauth_client.query(SQL().createTable(table)).split("\n")[1])
  print tableid
  
  #insert row into table
  rowid = int(oauth_client.query(SQL().insert(tableid, {'strings':'mystring', 'numbers': 12, 'locations':'Palo Alto, CA'})).split("\n")[1])
  print rowid
  
  #show rows
  print oauth_client.query(SQL().select(tableid, None, "numbers=12"))

  
  #delete row
  print oauth_client.query(SQL().delete(tableid, rowid))
  
  #drop table
  print oauth_client.query(SQL().dropTable(tableid))
  
  
  #import a table from CSV file
  tableid = int(CSVImporter(oauth_client).importFile("data.csv"))
  print tableid
  
  #drop table
  print oauth_client.query(SQL().dropTable(tableid))
  