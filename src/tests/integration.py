# encoding: utf-8

import unittest
from datetime import date
import simplejson as json
from application.ee import NDFI, Stats
from application.app import app
from application.models import Report, Area, Cell
from application import settings

class StatsTest(unittest.TestCase):
    """ test for reporting api 
    """

    def setUp(self):
        # create resources
        self.polygon = [[[-63.154907226557498, -4.8118385341739005], [-64.143676757807498, -4.8118385341739005], [-64.132690429682498, -6.2879986723276584], [-62.814331054682498, -6.3535159310087908]]]
        self.inv_polygon = [[[y, x] for x, y in self.polygon[0]]]
        self.r = Report(start=date(year=2011, month=2, day=1),
                        end=date(year=2011, month=3, day=1),
                        finished=True)
        self.r.put()
        self.cell = Cell(x=0, y=0, z=2, report=self.r, ndfi_high=1.0, ndfi_low=0.0)
        self.cell.put()
        self.area = Area(geo=json.dumps(self.inv_polygon), added_by=None, type=1, cell=self.cell)
        self.area.put()
        self.area.create_fusion_tables()
        ee_resource = 'MOD09GA'
        self.ndfi = NDFI(ee_resource,
                    self.r.comparation_range(),
                    self.r.range())
        self.stats = Stats()

    def test_stats(self):
        """
        """
        # freeze map with on area
        report_id = self.r.key().id()
        data = self.ndfi.freeze_map(self.r.base_map(), 
                             int(settings.FT_TABLE_ID),
                             self.r.key().id())
        self.assertTrue('data' in data)
        self.assertTrue('id' in data['data'])
        self.assertTrue(len(data['data']['id']) > 0)
    
        asset_id = data['data']['id']
        print "report id: ", asset_id

        # get stats for this area
        st = self.stats.get_stats_for_polygon(report_id, asset_id, self.polygon)
        
        self.assertTrue(st is not None)
        polygon_stats = st[0]
        print polygon_stats
        self.assertTrue(float(polygon_stats['def']) > 0.0)
        self.assertAlmostEquals(0.0, float(polygon_stats['deg']))
        def_area = float(polygon_stats['def'])
        print "deforested area: ", def_area

        # get stats for this area
        # move the polygon a little bit
        p = [[[x, y + 1.0] for x, y in self.polygon[0]]]
        st = self.stats.get_stats_for_polygon(report_id, asset_id, p)
        self.assertTrue(st is not None)
        print st[0]
        polygon_stats = st['data']['properties']['classHistogram']['values']['null']['values']
        self.assertTrue(float(polygon_stats['def']) > 0.0)
        self.assertTrue(float(polygon_stats['def']) < def_area)
        print "new deforested area: ", float(polygon_stats['def'])

        # search in area whiout deforesation
        p = [[[x+4.0, y] for x, y in self.polygon[0]]]
        st = self.stats.get_stats_for_polygon(report_id, asset_id, p)
        self.assertTrue(st is not None)
        polygon_stats = st[0]
        self.assertAlmostEquals(0.0, float(polygon_stats['def']))
        self.assertAlmostEquals(0.0, float(polygon_stats['deg']))

