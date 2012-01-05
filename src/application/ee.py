#encoding: utf-8

import logging
import settings
import simplejson as json
import collections

from earthengine.connector import EarthEngine

from time_utils import timestamp

METER2_TO_KM2 = 1.0/(1000*1000)

CALL_SCOPE = "SAD"

class Stats(object):

    TOTAL_AREA_KEY = u'1'
    DEF_KEY = u'7'
    DEG_KEY = u'8'

    def __init__(self):
        self.ee = EarthEngine(settings.EE_TOKEN)

    def _execute_cmd(self, url, cmd):
        params = "&".join(("%s=%s"% v for v in cmd.iteritems()))
        return self.ee.post(url, params)

    def get_stats_for_table(self, report_id, frozen_image, table_id, key_name='name'):
        return self._execute_cmd("/value", {
            "image": json.dumps({
                "creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.GetStats",
                "args":[
                    {
                        "creator": CALL_SCOPE + "/com.google.earthengine.examples.sad.HistoricalFreeze",
                        "args":[
                            frozen_image,
                            {
                                "table_id": int(settings.FT_TABLE_ID),
                                "type":"FeatureCollection",
                                'mark': str(timestamp()),
                                "filters":[
                                {
                                    "metadata":"report_id",
                                    "equals": int(report_id)
                                }
                                ]
                            },
                            "type"
                         ],
                         "type":"Image",
                    },
                    {
                        "table_id": int(table_id),
                        "type":"FeatureCollection"
                    },
                    "name"
                 ]
            }),
            "fields": "classHistogram"
        })

    def get_stats_for_polygon(self, assetids, polygon):
        """ example poygon, must be CCW
            #polygon = [[[-61.9,-11.799],[-61.9,-11.9],[-61.799,-11.9],[-61.799,-11.799],[-61.9,-11.799]]]
        """
        # javascript way, lovely
        if not hasattr(assetids, '__iter__'):
            assetids = [assetids]

        reports = []
        for report_id, asset_id in assetids:
            reports.append({
                    "args":[
                        asset_id,
                        {
                            "table_id": int(settings.FT_TABLE_ID),
                            "type":"FeatureCollection",
                            #'mark': str(timestamp())
                            "filters":[
                                {
                                "metadata":"report_id",
                                "equals": int(report_id)
                                }
                            ]
                        },
                        "type"
                    ],
                    "type":"Image",
                    "creator": CALL_SCOPE + "/com.google.earthengine.examples.sad.HistoricalFreeze"
             })

        data = self._execute_cmd("/value", {
            "image": json.dumps({
                    "creator": CALL_SCOPE + "/com.google.earthengine.examples.sad.GetStatsList",
                    "args":[reports, {
                        'features': [{
                           'type': 'feature',
                           'geometry': { 
                                'type': 'polygon',
                                'coordinates': polygon,
                                'properties':{'name': 'myPoly'}
                            }
                        }]
                    }, "name" ]
             }),
            "fields": "classHistogram"
        })

        try:
            raw_stats = data['data']['properties']['classHistogram']
        except KeyError:
            return None
        stats = []
        for x in raw_stats:
            logging.info(x)
            s = x['values']['null']['values']
            stats.append({
                "total_area": sum(map(float, s.values()))*METER2_TO_KM2,
                'def': float(s[Stats.DEF_KEY])*METER2_TO_KM2,
                'deg': float(s[Stats.DEG_KEY])*METER2_TO_KM2,
            })
        return stats

    def get_stats(self, report_id, frozen_image, table_id):
        r = self.get_stats_for_table(report_id, frozen_image,  table_id)
        try:
            stats_region = r["data"]["properties"]["classHistogram"]["values"]
        except KeyError:
            return None
        stats = {}
        for k,values in stats_region.iteritems():
            # google earth engine return pixels, each pixel has 250m on a side...
            # values classificacion:
            # 1 -> total_area
            # 7 -> deforestation
            # 8 -> degradation
            v = values['values']
            stats[str(table_id) + '_' + k] = {
                "id": k,
                "table": table_id,
                "total_area": sum(map(float, v.values()))*METER2_TO_KM2,
                "def": int(v[Stats.DEF_KEY])*METER2_TO_KM2,
                "deg": int(v[Stats.DEG_KEY])*METER2_TO_KM2
            }

        return stats

class EELandsat(object):

    def __init__(self, resource):
        self.resource = resource
        self.ee = EarthEngine(settings.EE_TOKEN)

    def list(self, bounds, params={}):
        images = self.ee.get("/list?id=%s&bbox=%s&fields=ACQUISITION_DATE" % (self.resource, bounds))
        logging.info(images)
        if 'data' in images:
            return [x['id'] for x in images['data']]
        return []

    def mapid(self, start, end):
        MAP_IMAGE1 = {
            'creator':'LANDSAT/LandsatTOA',
            'input':'LANDSAT/L7_L1T',
            'bands':[{'id':'10','data_type':'float'},{'id':'20','data_type':'float'},{'id':'30','data_type':'float'}],
            'start_time': start,
            'end_time': end
        };
        MAP_IMAGE = {
             "creator": "SimpleMosaic",
             "args": [MAP_IMAGE1]
        }
        PREVIEW_GAIN = 500;
        MAP_IMAGE_BANDS = ['30','20','10'];
        cmd = {
            'image': json.dumps(MAP_IMAGE), #json.dumps(lanstat),
            'bands': ','.join(MAP_IMAGE_BANDS), #'30,20,10',
            'gain': PREVIEW_GAIN
        }
        return self._execute_cmd("/mapid", cmd)

    def _execute_cmd(self, url, cmd):
        params = "&".join(("%s=%s"% v for v in cmd.iteritems()))
        return self.ee.post(url, params)



#http://earthengine.googleapis.com/api/list?id=LANDSAT/L5_L1T&bbox=72.6,18.8,73.1,19.18
class NDFI(object):
    """ ndfi info for a period of time
    """

    # hardcoded data for request

    PRODES_IMAGE = {
        "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.ProdesImage',
        "args": ["PRODES_2009"]
    };

    MODIS_BANDS = [
          'sur_refl_b01_250m', 'sur_refl_b02_250m', 'sur_refl_b03_500m',
          'sur_refl_b04_500m', 'sur_refl_b06_500m', 'sur_refl_b07_500m'];

    THIS_POLY = None

    def __init__(self, ee_res, last_perdiod, work_period):
        self.last_perdiod = dict(start=last_perdiod[0],
                                 end=last_perdiod[1])
        self.work_period = dict(start=work_period[0],
                               end=work_period[1])
        self.earth_engine_resource = ee_res
        self.ee = EarthEngine(settings.EE_TOKEN)
        self._image_cache = {}

    def mapid2_cmd(self, asset_id, polygon=None, rows=10, cols=10):
        return {"creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.GetNDFIDelta","args": [
            self.last_perdiod['start'],
            self.last_perdiod['end'],
            self.work_period['start'],
            self.work_period['end'],
            "MODIS/MOD09GA",
            "MODIS/MOD09GQ",
            {'type':'FeatureCollection','table_id': 1868251, 'mark': str(timestamp())},
            {"creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.ProdesImage","args":[asset_id]},
            polygon,
            rows,
            cols]
        }

    def mapid2(self, asset_id):
        cmd = {
            "image": json.dumps(self.mapid2_cmd(asset_id)),
            "format": 'png'

        }
        return self._execute_cmd('/mapid', cmd)


    def freeze_map(self, asset_id, table, report_id):
        """
        """
        cmd ={
            "value": json.dumps({
                "creator": CALL_SCOPE + "/com.google.earthengine.examples.sad.FreezeMap",
                "args":[{
                        "creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.ProdesImage",
                        "args":[asset_id]
                    },
                    {'type':'FeatureCollection','table_id':1228540,'mark': str(timestamp())},
                    #{
                        #"type":"FeatureCollection",
                        #"table_id": table, "filters":[
                            #{"metadata":"report_id", "equals": report_id}
                        #]
                    #},
                    "type"
                ],
                "type":"Image"
             }),
        }
        return self._execute_cmd('/create', cmd)

    def rgbid(self):
        """ return params to access NDFI rgb image """
        # get map id from EE
        params = self._RGB_image_command(self.work_period)
        return self._execute_cmd('/mapid', params)

    def smaid(self):
        """ return params to access NDFI rgb image """
        # get map id from EE
        params = self._SMA_image_command(self.work_period)
        return self._execute_cmd('/mapid', params)

    def ndfi0id(self):
        # get map id from EE
        params = self._NDFI_period_image_command(self.last_perdiod)
        return self._execute_cmd('/mapid', params)

    def ndfi1id(self):
        # get map id from EE
        params = self._NDFI_period_image_command(self.work_period)
        return self._execute_cmd('/mapid', params)

    def rgb_strech(self, polygon, bands):
        # this is an special call, the application needs to call /value
        # before call /mapid in order to google earthn engine makes his work
        cmd = self._RGB_streched_command(self.work_period, polygon, bands)
        del cmd['bands']
        cmd['fields'] = 'stats_sur_refl_b01,stats_sur_refl_b02,stats_sur_refl_b03,stats_sur_refl_b04,stats_sur_refl_b05'

        self._execute_cmd('/value', cmd)
        cmd = self._RGB_streched_command(self.work_period, polygon, bands)
        return self._execute_cmd('/mapid', cmd)

    def _get_polygon_bbox(self, polygon):
        lats = [x[0] for x in polygon]
        lngs = [x[1] for x in polygon]
        max_lat = max(lats)
        min_lat = min(lats)
        max_lng = max(lngs)
        min_lng = min(lngs)
        return ((min_lat, max_lat), (min_lng, max_lng))

    def _execute_cmd(self, url, cmd):
        params = "&".join(("%s=%s"% v for v in cmd.iteritems()))
        return self.ee.post(url, params)

    def ndfi_change_value(self, asset_id, polygon, rows=10, cols=10):
        img = self.mapid2_cmd(asset_id, polygon, rows, cols)
        cmd = {
            "image": json.dumps(img),
            "fields": 'ndfiSum'#','.join(fields)
        }
        return self._execute_cmd('/value', cmd)

    def ndfi_change_value_old(self, polygons, rows=10, cols=10):
        """ return how much NDFI has changed in the time period
            ``polygons`` are a list of closed polygons defined by lat, lon::

            [
                [ [lat, lon], [lat, lon]...],
                [ [lat, lon], [lat, lon]...]
            ]

            for performance reassons bbox greater than 3 degrees are now allowed
        """
        # some assertions
        for p in polygons:
            bbox = self._get_polygon_bbox(p)
            if bbox[0][1] - bbox[0][0] > 3.5 or bbox[1][1] - bbox[1][0] > 3.5:
                #raise Exception("polygon bbox size must be less than 3 degrees")
                pass

        cmd = self._NDFI_change_value(
            self.last_perdiod,
            self.work_period,
            polygons,
            rows,
            cols
        )
        return self._execute_cmd('/value', cmd)


    def _images_for_period(self, period):
        cache_key = "%d-%d" %(period['start'], period['end'])
        if cache_key in self._image_cache:
            img = self._image_cache[cache_key]
        else:
            reference_images = self.ee.get("/list?id=%s&starttime=%s&endtime=%s" % (
                self.earth_engine_resource,
                int(period['start']),
                int(period['end'])
            ))
            logging.info(reference_images)
            img = [x['id'] for x in reference_images['data']]
            self._image_cache[cache_key] = img
        return img

    def _image_composition(self, image_list):
        """ create commands to compose images in google earth engine

            ok, i really have NO idea what's going on :)
        """
        specs = []
        for image in image_list:
            name = image.split("_", 2)[-1]
            specs.append({
              "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.ModisCombiner',
              "args": ['MOD09GA_005_' + name, 'MOD09GQ_005_' + name]
            });
        return specs;


    def _NDFI_image(self, period):
        """ given image list from EE, returns the operator chain to return NDFI image """
        return {
            "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.NDFIImage',
            "args": [{
              "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.UnmixModis',
              "args": [{
                "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.KrigingStub',
                "args": [ self._MakeMosaic(period) ]
              }]
            }]
         }

    def _change_detection_data(self, reference_period, work_period, polygons=[], cols=10, rows=10):
        ndfi_image_1 = self._NDFI_image(reference_period)
        ndfi_image_2 = self._NDFI_image(work_period)
        return {
               "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.ChangeDetectionData',
               "args": [ndfi_image_1,
                        ndfi_image_2,
                        self.PRODES_IMAGE,
                        polygons,
                        rows,
                        cols]
        }


    def _NDFI_change_value(self, reference_period, work_period, polygons, cols=10, rows=10):
        """ calc the ndfi change value between two periods inside specified polys

            ``polygons`` are a list of closed polygons defined by lat, lon::

            [
                [ [lat, lon], [lat, lon]...],
                [ [lat, lon], [lat, lon]...]
            ]

        """
        POLY = []
        fields = []

        image = self._change_detection_data(reference_period, work_period, [polygons], cols, rows)
        return {
            "image": json.dumps(image),
            "fields": 'ndfiSum'#','.join(fields)
        }

    def _NDFI_period_image_command(self, period):
        """ get NDFI command to get map of NDFI for a period of time """
        ndfi_image = self._NDFI_image(period)
        return {
            "image": json.dumps(ndfi_image),
            "bands": 'vis-red,vis-green,vis-blue',
            "gain": 1,
            "bias": 0.0,
            "gamma": 1.6
        }

    def _RGB_image_command(self, period):
        """ commands for RGB image """
        return {
            "image": json.dumps({
               "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.KrigingStub',
               "args": [ self._MakeMosaic(period) ]
            }),
            "bands": 'sur_refl_b01,sur_refl_b04,sur_refl_b03',
            "gain": 0.1,
            "bias": 0.0,
            "gamma": 1.6
          };

    def _MakeMosaic(self, period):
        return {
          "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.MakeMosaic',
          "args": ["MODIS/MOD09GA","MODIS/MOD09GQ", 
                {'type':'FeatureCollection','table_id':1868251, 'mark': str(timestamp())}, #this number is an special fusion tables id but i have no idea what it is supposed to do
                period['start'], period['end']]
        }

    def _SMA_image_command(self, period):
        return {
            "image": json.dumps({
              "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.UnmixModis',
              "args": [{
                "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.KrigingStub',
                "args": [self._MakeMosaic(period)]
              }]
            }),
            "bands": 'gv,soil,npv',
            "gain": 256,
            "bias": 0.0,
            "gamma": 1.6
        };

    def _RGB_streched_command(self, period, polygon, bands):
        """ bands in format (1, 2, 3) """
        bands = "sur_refl_b0%d,sur_refl_b0%d,sur_refl_b0%d" % bands
        return {
            "image": json.dumps({
                "creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.StretchImage",
                "args":[{
                    "creator":"ClipToMultiPolygon",
                    "args":[{
                        "creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.KrigingStub",
                        "args":[ self._MakeMosaic(period)]
                    },
                    polygon]
                 },
                 ["sur_refl_b01","sur_refl_b02","sur_refl_b03","sur_refl_b04","sur_refl_b05"],
                 2 #EPIC
                 ]
            }),
            "bands": bands
        }




