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



class Report(db.Model):

    start = db.DateProperty();
    end = db.DateProperty();
    finished = db.BooleanProperty();

    @staticmethod
    def current():
        q = Report.all().order("-start")
        r = q.fetch(1)
        if r:
            return r[0]
        return None

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
    # used for speedup queries
    parent_id = db.StringProperty()
    report = db.ReferenceProperty(Report)
    ndfi_low = db.FloatProperty(default=0.4)
    ndfi_high = db.FloatProperty(default=0.6)
    ndfi_change_value = db.FloatProperty(default=0.0)
    done = db.BooleanProperty(default=False);

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

    def child(self, i, j):
        zz = self.z+1
        xx = (SPLITS**self.z)*self.x + i
        yy = (SPLITS**self.z)*self.y + j
        return Cell.get_or_create(self.report, xx, yy, zz)
        
    def children(self):
        """ return child cells """
        eid = self.external_id()
        childs = Cell.all()
        childs.filter('report =', self.report)
        childs.filter('parent_id =', eid)

        children_cells = dict((x.external_id(), x) for x in childs.fetch(SPLITS*SPLITS))

        cells = []
        for i in xrange(SPLITS):
            for j in xrange(SPLITS):
                zz = self.z+1
                xx = (SPLITS**self.z)*self.x + i
                yy = (SPLITS**self.z)*self.y + j

                cid= "_".join(map(str,(zz, xx, yy)))
                if cid in children_cells:
                    cell = children_cells[cid]
                else:
                    cell = Cell.default_cell(self.report, xx, yy, zz)
                cells.append(cell)
        return cells

    def calculate_ndfi_change_from_childs(self):
        ndfi = 0.0
        ch = self.children()
        for c in ch: 
            ndfi += c.ndfi_change_value
        self.ndfi_change_value = ndfi/len(ch)
        self.put()

    def calc_parent_id(self):
        return '_'.join((str(self.z - 1), str(self.x/SPLITS), str(self.y/SPLITS)))

    def put(self):
        self.parent_id = self.calc_parent_id()
        super(Cell, self).put()

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
        latest = self.latest_polygon()
        t = 0
        by = 'Nobody'
        if latest:
            t = timestamp(latest.added_on)
            by = latest.added_by.nickname()

        try:
            self.key()
            note_count = self.note_set.count()
        except:
            note_count = 0

        return {
                #'key': str(self.key()),
                'id': self.external_id(),
                'z': self.z,
                'x': self.x,
                'y': self.y,
                'report_id': str(self.report.key()),
                'ndfi_low': self.ndfi_low,
                'ndfi_high': self.ndfi_high,
                'ndfi_change_value': self.ndfi_change_value,
                'done': self.done,
                'latest_change': t,
                'added_by': by,
                'note_count': note_count
        }

    def latest_polygon(self):
        try:
            self.key()
        except:
            #not saved
            return None
        q = Area.all().filter('cell =', self).order('-added_on')
        o = q.fetch(1)
        if o:
            return o[0]
        return None

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
            deferred.defer(self.create_fusion_tables)
        else:
            deferred.defer(self.update_fusion_tables)
        return ret

    def delete(self):
        super(Area, self).delete()
        deferred.defer(self.delete_fusion_tables)
    
    def _get_ft_client(self):
        cl = FT(settings.FT_CONSUMER_KEY,
                settings.FT_CONSUMER_SECRET,
                settings.FT_TOKEN,
                settings.FT_SECRET)
        table_id = cl.table_id('areas')
        if not table_id:
            raise Exception("Create areas tables first")
        return cl

    def delete_fusion_tables(self):
        """ delete area from fusion tables. Do not use this method directly, call delete method"""
        cl = self._get_ft_client()
        table_id = cl.table_id('areas')
        cl.sql("delete from %s where rowid = '%s'" % (table_id, self.fusion_tables_id))

    def update_fusion_tables(self):
        """ update polygon in fusion tables. Do not call this method, use save method when change instance data """
        logging.info("updating fusion tables %s" % self.key())
        cl = self._get_ft_client()
        table_id = cl.table_id('areas')
        geo_kml = path_to_kml(json.loads(self.geo))
        cl.sql("update  %s set geo = '%s', type = '%s' where rowid = '%s'" % (table_id, geo_kml, self.type, self.fusion_tables_id))

    def create_fusion_tables(self):
        logging.info("saving to fusion tables %s" % self.key())
        cl = self._get_ft_client()
        table_id = cl.table_id('areas')
        geo_kml = path_to_kml(json.loads(self.geo))
        rowid = cl.sql("insert into %s ('geo', 'added_on', 'type') VALUES ('%s', '%s', %d)" % (table_id, geo_kml, self.added_on, self.type))
        self.fusion_tables_id = int(rowid.split('\n')[1])
        rowid = cl.sql("update %s set rowid_copy = '%s' where rowid = '%s'" % (table_id, self.fusion_tables_id, self.fusion_tables_id))
        self.put()

class Note(db.Model):
    """ user note on a cell """

    msg = db.TextProperty(required=True)
    added_by = db.UserProperty()
    added_on = db.DateTimeProperty(auto_now_add=True)
    cell = db.ReferenceProperty(Cell)

    def as_dict(self):
        return {'id': str(self.key()),
                'msg': self.msg, 
                'author': self.added_by.nickname(),
                'date': timestamp(self.added_on)}

    def as_json(self):
        return json.dumps(self.as_dict())
