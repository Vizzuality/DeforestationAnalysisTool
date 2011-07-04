'''
Created on Dec 22, 2010

@author: kbrisbin
'''


from authorization.clientlogin import ClientLogin
from sql.sqlbuilder import SQL
import ftclient
from fileimport.fileimporter import CSVImporter



if __name__ == "__main__":

  import sys, getpass
  username = sys.argv[1]
  password = getpass.getpass("Enter your password: ")
  
  token = ClientLogin().authorize(username, password)
  ft_client = ftclient.ClientLoginFTClient(token)

  
  #show tables
  results = ft_client.query(SQL().showTables())
  print results
  
  #create a table
  table = {'tablename':{'strings':'STRING', 'numbers':'NUMBER', 'locations':'LOCATION'}}
  tableid = int(ft_client.query(SQL().createTable(table)).split("\n")[1])
  print tableid
  
  #insert row into table
  rowid = int(ft_client.query(SQL().insert(tableid, {'strings':'mystring', 'numbers': 12, 'locations':'Palo Alto, CA'})).split("\n")[1])
  print rowid
  
  #show rows
  print ft_client.query(SQL().select(tableid, None, "numbers=12"))
  print ft_client.query(SQL().select(tableid, ['rowid','numbers'], "numbers=12"))

  #delete row
  print ft_client.query(SQL().delete(tableid, rowid))
  
  #drop table
  print ft_client.query(SQL().dropTable(tableid))
  
  #import a table from CSV file
  tableid = int(CSVImporter(ft_client).importFile("data.csv"))
  print tableid
  
  #drop table
  print ft_client.query(SQL().dropTable(tableid))
