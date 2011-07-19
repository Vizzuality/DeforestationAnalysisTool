"""
models.py

App Engine datastore models

"""

import logging
from google.appengine.ext import db
from google.appengine.ext import deferred

from application import settings
import simplejson as json
from time_utils import timestamp

from ft import FT

class Area(db.Model):
    """ area selected by user """

    DEGRADATION = 0
    DEFORESTATION = 1

    geo = db.TextProperty(required=True)
    #added_by = db.UserProperty()
    added_on = db.DateTimeProperty(auto_now_add=True)
    type = db.IntegerProperty(required=True)
    fusion_tables_id = db.IntegerProperty()

    def save(self):
        """ wrapper for put makes compatible with django"""
        exists = True
        try:
            self.key()
        except db.NotSavedError:
            exists = False
        ret = self.put()
        # call defer AFTER saving instance
        if not exists:
            deferred.defer(self.save_to_fusion_tables)
        return ret

    def save_to_fusion_tables(self):
        logging.info("saving to fusion tables %s" % self.key())
        cl = FT(settings.FT_CONSUMER_KEY,
                settings.FT_CONSUMER_SECRET,
                settings.FT_TOKEN,
                settings.FT_SECRET)
        table_id = cl.table_id('areas')
        if table_id:
            rowid = cl.sql("insert into %s ('geo', 'added_on', 'type') VALUES ('%s', '%s', %d)" % (table_id, self.geo, self.added_on, self.type))
            self.fusion_tables_id = int(rowid.split('\n')[1])
            self.put()
        else:
            raise Exception("Create areas tables first")



class Note(db.Model):
    """ user note on a cell """

    msg = db.TextProperty(required=True)
    #added_by = db.UserProperty()
    added_on = db.DateTimeProperty(auto_now_add=True)
    cell_z = db.IntegerProperty(required=True)
    cell_x = db.IntegerProperty(required=True)
    cell_y = db.IntegerProperty(required=True)

    def as_dict(self):
        return {'id': str(self.key()),
            'msg': self.msg}

    def as_json(self):
        return json.dumps(self.as_dict())

class Report(db.Model):

    start = db.DateProperty();
    end = db.DateProperty();
    finished = db.BooleanProperty();

    def as_dict(self):
        return {
                'id': str(self.key()),
                'start': timestamp(self.start),
                'end': timestamp(self.end),
                'finished': self.finished
        }

    def as_json(self):
        return json.dumps(self.as_dict())

class Cell(db.Model):

    z = db.IntegerProperty(required=True)
    x = db.IntegerProperty(required=True)
    y = db.IntegerProperty(required=True)
    report = db.ReferenceProperty(Report)
    ndfi_low = db.FloatProperty()
    ndfi_high = db.FloatProperty()

    def as_dict(self):
        return {
                #'id': str(self.key()),
                'z': self.z,
                'x': self.x,
                'y': self.y,
                'report_id': str(self.report),
                'ndfi_low': self.ndfi_low,
                'ndfi_high': self.ndfi_high
        }

    def as_json(self):
        return json.dumps(self.as_dict())
