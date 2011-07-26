
# encoding: utf-8

"""
small wrapper over fusion tables to simplify usage
"""

import logging

from fusiontables.authorization.oauth import OAuth
from fusiontables.sql.sqlbuilder import SQL
from fusiontables import ftclient

class FT(object):
    """ wrapper to access to fusion tables """

    table_cache = {}

    def __init__(self, consumer_key, consumer_secret, token, secret):
        self.client = ftclient.OAuthFTClient(consumer_key, consumer_secret, token, secret)

    def table_id(self, table_name):
        if table_name in FT.table_cache:
            return FT.table_cache[table_name]
        self.get_tables()
        if table_name in FT.table_cache:
            return FT.table_cache[table_name]
        return None

    def get_tables(self):
        """ return a list with (table_id, table_name) """
        r = self.client.query("show tables")
        if r:
            tables = [tuple(reversed(x.split(','))) for x in filter(None, r.split('\n'))][1:]
            FT.table_cache = dict(tables)
            return tables
        else:
            logging.error("get_tables: no response")

    def create_table(self, table):
        """ create a table given spec in this way:
            table = {'test_poli':{'name':'STRING', 'locations':'LOCATION'}}
            return FT table id if success, None otherwise
        """
        try:
            sql = SQL().createTable(table)
            return int(self.sql(sql).split("\n")[1])
        except ValueError:
            return None

    def sql(self, sql):
        logging.info("FT:SQL: %s" % sql)
        print("FT:SQL: %s" % sql)
        r = self.client.query(sql)
        print("-> %s" % r)
        return r




