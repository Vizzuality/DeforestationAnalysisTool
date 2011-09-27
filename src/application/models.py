"""
models.py

App Engine datastore models

"""

import logging
import operator
from google.appengine.ext import db
from google.appengine.ext import deferred

from datetime import datetime, date
from dateutil.relativedelta import relativedelta

from application import settings
import simplejson as json
from time_utils import timestamp
from mercator import Mercator

from ft import FT

from kml import path_to_kml

CELL_BLACK_LIST = ['1_0_0', '1_1_0', '1_0_1', '1_0_2', '1_0_3', '1_0_7', '1_0_8', '1_0_9',
             '1_1_7', '1_1_8', '1_1_9', '1_2_8', '1_2_9', '1_3_8', '1_3_9',
             '1_2_0', '1_5_0', '1_6_0', '1_8_0', '1_9_0','1_8_1', '1_9_1',
             '1_8_8', '1_8_9', '1_9_8', '1_9_9']


class User(db.Model):

    current_cells = db.IntegerProperty(default=0);
    user = db.UserProperty()
    role = db.StringProperty(default='editor')
    mail = db.StringProperty()

    @staticmethod
    def reset():
        """reset cell count """
        for x in User.all():
            x.current_cells = 0;
            x.put()


    @staticmethod
    def get_user(user):
        q = User.all().filter('user =', user)
        u = q.fetch(1)
        if u:
            return u[0]
        return None

    @staticmethod
    def get_or_create(user):
        u = User.get_user(user)
        if not u:
            u = User(user=user)
            u.put()
        return u

    def is_admin(self):
        return self.role == 'admin'

    def as_dict(self):
        return {
                'id': str(self.key()),
                'current_cells': self.current_cells,
                'mail': self.user.email(),
                'is_admin': self.is_admin()
        }

    def as_json(self):
        return json.dumps(self.as_dict())


class Report(db.Model):

    start = db.DateProperty();
    end = db.DateProperty();
    finished = db.BooleanProperty(default=False);
    cells_finished = db.IntegerProperty(default=0)
    total_cells = db.IntegerProperty(default=(100-len(CELL_BLACK_LIST))*100)
    assetid = db.StringProperty()

    @staticmethod
    def current():
        q = Report.all().order("-start")
        r = q.fetch(1)
        if r:
            return r[0]
        return None

    def cells_finished(self):
        return Cell.all().filter('report =', self).filter('done =', True).count()

    def as_dict(self):
        return {
                'id': str(self.key()),
                'fusion_tables_id': str(self.key().id()),
                'start': timestamp(self.start),
                #'end': timestamp(self.end),
                'finished': self.finished,
                'cells_finished': self.cells_finished(),
                'total_cells': self.total_cells,
                'str': self.start.strftime("%Y-%b-%d"),
                'assetid': self.assetid
        }

    def close(self, assetid):
        if not self.finished:
            self.end = date.today();
            self.finished = True
            self.assetid = assetid
            self.put()
            User.reset()
            #deferred.defer(self.update_fusion_tables)

    def as_json(self):
        return json.dumps(self.as_dict())

    def comparation_range(self):
        r = self.previous()
        if r:
            d = r.start
        else:
            st = date(self.start.year, self.start.month, self.start.day)
            d = st - relativedelta(months=1)
        return tuple(map(timestamp, (d, self.start)))

    def base_map(self):
        r = self.previous()
        if r:
            return r.assetid
        #return "PRODES_2009"
        return "PRODES_IMAZON_2011a"

    def previous(self):
        r = Report.all().filter('start <', self.start).order('-start').fetch(1)
        if r:
            return r[0]
        return None

    def range(self):
        end = datetime.now()
        end = datetime(2011, 8, 2)
        return tuple(map(timestamp, (self.start, end)))

    def __unicode__(self):
        r1 = self.comparation_range()
        return u"(%s, %s) -> %s" % (datetime.fromtimestamp(r1[0]/1000).isoformat(),
                                   datetime.fromtimestamp(r1[1]/1000).isoformat(),
                                   self.start.isoformat())

SPLITS = 10
class Cell(db.Model):

    z = db.IntegerProperty(required=True)
    x = db.IntegerProperty(required=True)
    y = db.IntegerProperty(required=True)
    # used for speedup queries
    parent_id = db.StringProperty()
    report = db.ReferenceProperty(Report)
    ndfi_low = db.FloatProperty(default=0.2)
    ndfi_high = db.FloatProperty(default=0.3)
    ndfi_change_value = db.FloatProperty(default=0.0)
    done = db.BooleanProperty(default=False);
    last_change_by = db.UserProperty()
    last_change_on = db.DateTimeProperty(auto_now=True)

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

    def get_parent(self):
        if self.z == 0:
            return None
        pid = self.calc_parent_id()
        z, x, y = Cell.cell_id(pid)
        return Cell.get_or_default(self.report, x, y, z)

    def put(self):
        self.parent_id = self.calc_parent_id()
        p = self.get_parent()
        # update parent
        if p:
            p.last_change_by = self.last_change_by
            p.put()
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
        return Cell(z=z, x=x, y=y, ndfi_low=0.2, ndfi_high=0.3, report=r)

    def external_id(self):
        return "_".join(map(str,(self.z, self.x, self.y)))

    def as_dict(self):
        #latest = self.latest_polygon()
        t = 0
        by = 'Nobody'
        """
        if latest:
            t = timestamp(latest.added_on)
            by = latest.added_by.nickname()
        """

        try:
            self.key()
            note_count = self.note_set.count()
            t = timestamp(self.last_change_on)
            if self.last_change_by:
                by = self.last_change_by.nickname()
            children_done = self.children_done()
        except:
            note_count = 0
            t = 0
            children_done = 0

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
                'polygon_count': self.polygon_count(),
                'note_count': note_count,
                'children_done': children_done,
                'blocked': self.external_id() in CELL_BLACK_LIST
        }

    def polygon_count(self):
        try:
            self.key()
        except:
            #not saved
            return 0
        return Area.all().filter('cell =', self).order('-added_on').count();

    def children_done(self):
        eid = self.external_id()
        childs = Cell.all()
        childs.filter('report =', self.report)
        childs.filter('parent_id =', eid)
        childs.filter('done =', True)
        return childs.count()

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

    def bbox_polygon(self, top_bounds):
        bounds = self.bounds(top_bounds)
        ne = bounds[0]
        sw = bounds[1]
        # spcify lon, lat FUCK, MONKEY BALLS
        return [[[ (sw[1], sw[0]), (sw[1], ne[0]), (ne[1], ne[0]), (ne[1], sw[0]) ]]]


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

    @staticmethod
    def _get_ft_client():
        cl = FT(settings.FT_CONSUMER_KEY,
                settings.FT_CONSUMER_SECRET,
                settings.FT_TOKEN,
                settings.FT_SECRET)
        table_id = cl.table_id(settings.FT_TABLE)
        if not table_id:
            raise Exception("Create areas %s first" % settings.FT_TABLE)
        return cl

    def fusion_tables_type(self):
        """ custom type id for FT """
        if self.type == self.DEGRADATION:
            return 3
        return 2

    def delete_fusion_tables(self):
        """ delete area from fusion tables. Do not use this method directly, call delete method"""
        cl = self._get_ft_client()
        table_id = cl.table_id(settings.FT_TABLE)
        cl.sql("delete from %s where rowid = '%s'" % (table_id, self.fusion_tables_id))

    def update_fusion_tables(self):
        """ update polygon in fusion tables. Do not call this method, use save method when change instance data """
        logging.info("updating fusion tables %s" % self.key())
        cl = self._get_ft_client()
        table_id = cl.table_id(settings.FT_TABLE)
        geo_kml = path_to_kml(json.loads(self.geo))
        cl.sql("update  %s set geo = '%s', type = '%s' where rowid = '%s'" % (table_id, geo_kml, self.fusion_tables_type(), self.fusion_tables_id))

    def create_fusion_tables(self):
        logging.info("saving to fusion tables %s" % self.key())
        cl = self._get_ft_client()
        table_id = cl.table_id(settings.FT_TABLE)
        geo_kml = path_to_kml(json.loads(self.geo))
        rowid = cl.sql("insert into %s ('geo', 'added_on', 'type', 'report_id') VALUES ('%s', '%s', %d, %d)" % (table_id, geo_kml, self.added_on, self.fusion_tables_type(), self.cell.report.key().id()))
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

class Error(db.Model):
    """ javascript errors registered """
    msg = db.TextProperty(required=True)
    url = db.StringProperty(required=True)
    line= db.StringProperty(required=True)
    user = db.UserProperty()


class StatsStore(db.Model):
    report = db.ReferenceProperty(Report)
    json = db.TextProperty()

    @staticmethod
    def get_for_report(id):
        r = Report.get_by_id(id)
        return json.decode(r.stats_set.json)

    def as_dict(self):
        if not hasattr(self, '_as_dict'):
            self._as_dict = json.loads(self.json)
        return self._as_dict

    def for_table(self, table, zone=None):
        tb = [v for k, v in self.as_dict()['stats'].iteritems() if str(v['table']) == table]
        if zone:
            return [x for x in tb if str(x['id']) == zone]

        return tb


    def table_accum(self, table, zone=None):
        table_stats = self.for_table(table, zone)
        if not table_stats:
            return None
        return {
            # TODO add total KM^2
            'def': reduce(operator.add, map(int, (x['def'] for x in table_stats))),
            'deg': reduce(operator.add, map(int, (x['deg'] for x in table_stats)))}



