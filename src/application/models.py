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
from mercator import Mercator

from ft import FT

from kml import path_to_kml


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
                'finished': self.finished,
                'str': self.start.strftime("%B-%Y")
        }

    def as_json(self):
        return json.dumps(self.as_dict())

    def range(self):
        return tuple(map(timestamp, (self.start, self.end)))

SPLITS = 10
class Cell(db.Model):

    z = db.IntegerProperty(required=True)
    x = db.IntegerProperty(required=True)
    y = db.IntegerProperty(required=True)
    report = db.ReferenceProperty(Report)
    ndfi_low = db.FloatProperty()
    ndfi_high = db.FloatProperty()
    ndfi_change_value = db.FloatProperty()

    @staticmethod
    def get_cell(report, x, y, z):
        q = Cell.all()
        q.filter("z =", z)
        q.filter("x =", x)
        q.filter("y =", y)
        q.filter("report =", report)
        cell = q.fetch(1)
        if cell:
            return cell[0]
        return None

    def children(self):
        """ return child cells """
        cells = []
        for i in xrange(SPLITS):
            for j in xrange(SPLITS):
                zz = self.z+1
                xx = (SPLITS**self.z)*self.x + i
                yy = (SPLITS**self.z)*self.y + j

                cell = Cell.get_cell(self.report, xx, yy, zz)
                if not cell:
                    cell = Cell.default_cell(self.report, xx, yy, zz)
                cells.append(cell)
        return cells

    @staticmethod
    def cell_id(id):
        return tuple(map(int, id.split('_')))

    @staticmethod
    def get_or_create(r, x, y ,z):
        c = Cell.get_cell(r, x, y, z)
        if not c:
            c = Cell.default_cell(r, x, y ,z)
            c.put()
        return c

    @staticmethod
    def get_or_default(r, x, y, z):
        cell = Cell.get_cell(r, x, y, z)
        if not cell:
            cell = Cell.default_cell(r, x, y, z)
        return cell

    @staticmethod
    def default_cell(r, x, y, z):
        return Cell(z=z, x=x, y=y, ndfi_low=0.6, ndfi_high=0.8, report=r)
    
    def external_id(self):
        return "_".join(map(str,(self.z, self.x, self.y)))

    def as_dict(self):
        return {
                #'key': str(self.key()),
                'id': self.external_id(),
                'z': self.z,
                'x': self.x,
                'y': self.y,
                'report_id': str(self.report),
                'ndfi_low': self.ndfi_low,
                'ndfi_high': self.ndfi_high
        }

    def as_json(self):
        return json.dumps(self.as_dict())

    def bounds(self, top_level_bounds):
        """ return lat,lon bounds given toplevel BB bounds 
            ``top_level_bounds`` is a tuple with (ne, sw) being
            ne and sw a (lat, lon) tuple
            return bounds in the same format
        """
        righttop = Mercator.project(*top_level_bounds[0]) #ne
        leftbottom = Mercator.project(*top_level_bounds[1]) #sw
        topx = leftbottom[0]
        topy = righttop[1]
        w = righttop[0] - leftbottom[0];
        h = -righttop[1] + leftbottom[1];
        sp = SPLITS**self.z
        sx = w/sp;
        sy = h/sp;
        return (
            Mercator.unproject((self.x + 1)*sx + topx, (self.y)*sy + topy),
            Mercator.unproject(self.x*sx + topx, topy + (self.y+1)*sy)
        )

class Area(db.Model):
    """ area selected by user """

    DEGRADATION = 0
    DEFORESTATION = 1

    geo = db.TextProperty(required=True)
    added_by = db.UserProperty()
    added_on = db.DateTimeProperty(auto_now_add=True)
    type = db.IntegerProperty(required=True)
    fusion_tables_id = db.IntegerProperty()
    cell = db.ReferenceProperty(Cell)

    def as_dict(self):
        return {
                'id': str(self.key()),
                'key': str(self.key()),
                'cell': str(self.cell.key()),
                'paths': json.loads(self.geo),
                'type': self.type,
                'fusion_tables_id': self.fusion_tables_id,
                'added_on': timestamp(self.added_on),
                'added_by': str(self.added_by.nickname())
        }

    def as_json(self):
        return json.dumps(self.as_dict())

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

    #TODO: delete and update tableon FT

    def save_to_fusion_tables(self):
        logging.info("saving to fusion tables %s" % self.key())
        cl = FT(settings.FT_CONSUMER_KEY,
                settings.FT_CONSUMER_SECRET,
                settings.FT_TOKEN,
                settings.FT_SECRET)
        table_id = cl.table_id('areas')
        if table_id:
            geo_kml = path_to_kml(json.loads(self.geo))
            rowid = cl.sql("insert into %s ('geo', 'added_on', 'type') VALUES ('%s', '%s', %d)" % (table_id, geo_kml, self.added_on, self.type))
            self.fusion_tables_id = int(rowid.split('\n')[1])
            rowid = cl.sql("update %s set rowid_copy = '%s' where rowid = '%s'" % (table_id, self.fusion_tables_id, self.fusion_tables_id))
            self.put()
        else:
            raise Exception("Create areas tables first")
