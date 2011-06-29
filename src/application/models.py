"""
models.py

App Engine datastore models

"""

import logging
from google.appengine.ext import db
from google.appengine.ext import deferred

class Area(db.Model):
    """ area selected by user """

    DEGRADATION = 0
    DEFORESTATION = 1

    geo = db.TextProperty(required=True)
    #added_by = db.UserProperty()
    added_on = db.DateTimeProperty(auto_now_add=True)
    type = db.IntegerProperty(required=True)
    
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
