#encoding: utf-8

import logging
import settings
import simplejson as json
import collections
import urllib
import time

from earthengine.connector import EarthEngine

from time_utils import timestamp
from datetime import timedelta, date

METER2_TO_KM2 = 1.0/(1000*1000)

CALL_SCOPE = "SAD"
KRIGING = "kriging/com.google.earthengine.examples.kriging.KrigedModisImage"

class Stats(object):

    TOTAL_AREA_KEY = u'1'
    DEF_KEY = u'7'
    DEG_KEY = u'8'

    def __init__(self):
        self.ee = EarthEngine(settings.EE_TOKEN)

    def _execute_cmd(self, url, cmd):
        params = "&".join(("%s=%s"% v for v in cmd.iteritems()))
        return self.ee.post(url, params)

    def paint_call(self, current_asset, report_id, table, value):
        return {
          "creator": "Paint", "args": [current_asset,
          {
            "table_id": int(table), "type": "FeatureCollection", 
            "filter":[{"property":"report_id","equals":int(report_id)},
                      {"property":"type","equals":value}]},
          value]
        }

    def get_historical_freeze(self, report_id, frozen_image):

        remapped = {"algorithm": "Image.remap", "image":frozen_image, 
          "from":[0,1,2,3,4,5,6,7,8,9], "to":[0,1,2,3,4,5,6,1,1,9]}

        def_image = self.paint_call(remapped, report_id, settings.FT_TABLE_ID, 7)

        selected_def = {"algorithm": "Image.select", "input": def_image, 
                        "bandSelectors":["remapped"]}

        deg_image = self.paint_call(selected_def, report_id, settings.FT_TABLE_ID, 8)

        renamed_image = {"algorithm": "Image.select", "input": deg_image, 
                        "bandSelectors":["remapped"], "newNames":["class"]}

        clipped_image = {"creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.AddBB","args":[renamed_image, frozen_image, "classification"]}

        map_image = {"algorithm": "Image.addBands", "dstImg": frozen_image, "srcImg": clipped_image,
                    "names": ["class"], "overwrite": True}

        return map_image

    def get_stats_for_table(self, report_id, frozen_image, table_id, key_name='name'):

        historical_call = self.get_historical_freeze(report_id, frozen_image)

        stats = {"creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.GetStats",
                 "args":[historical_call, {"table_id": int(table_id), "type":"FeatureCollection"}, "name"]}

        return self._execute_cmd("/value", {
            "image": json.dumps(stats),
            "fields": "classHistogram"
        })

        """
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
                                "filter":[
                                {
                                    "property":"report_id",
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
        """

    def get_stats_for_polygon(self, assetids, polygon):
        """ example poygon, must be CCW
            #polygon = [[[-61.9,-11.799],[-61.9,-11.9],[-61.799,-11.9],[-61.799,-11.799],[-61.9,-11.799]]]
        """
        # javascript way, lovely
        if not hasattr(assetids, '__iter__'):
            assetids = [assetids]

        reports = []
        for report_id, asset_id in assetids:
            reports.append(self.get_historical_freeze(report_id, asset_id))

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
	landsat_bands = ['10','20','30','40','50','70','80','61','62']
	creator_bands =[{'id':id, 'data_type':'float'} for id in landsat_bands]
        MAP_IMAGE1 = {
            'creator':'LANDSAT/LandsatTOA',
            'input':'LANDSAT/L7_L1T',
            'bands':creator_bands,
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

    def __init__(self, ee_res, last_period, work_period):
        self.last_period = dict(start=last_period[0],
                                 end=last_period[1])
        self.work_period = dict(start=work_period[0],
                               end=work_period[1])
        self.earth_engine_resource = ee_res
        self.ee = EarthEngine(settings.EE_TOKEN)
        self._image_cache = {}

    def paint_deforestation(self, asset_id, month, year):
	year_str = "%04d" % (year)
        #end = "%04d%02d" % (year, month)
        return {
          "type": "Image", "creator": "Paint", "args": [asset_id,
          {
            "table_id": int(settings.FT_TABLE_ID), "type": "FeatureCollection", 
            "filter":[{"property":"type","equals":7}, {"property":"asset_id","contains":year_str}]},
          4]
        }

    def mapid2_cmd(self, asset_id, polygon=None, rows=5, cols=5):
        year_msec = 1000 * 60 * 60 * 24 * 365 
        month_msec = 1000 * 60 * 60 * 24 * 30 
	six_months_ago = self.work_period['end'] - month_msec * 6
	one_month_ago = self.work_period['end'] - month_msec
	last_month = time.gmtime(int(six_months_ago / 1000))[1]
	last_year = time.gmtime(int(six_months_ago / 1000))[0]
	previous_month = time.gmtime(int(one_month_ago / 1000))[1]
	previous_year = time.gmtime(int(one_month_ago / 1000))[0]
        work_month = self.getMidMonth(self.work_period['start'], self.work_period['end'])
        work_year = self.getMidYear(self.work_period['start'], self.work_period['end'])
        end = "%04d%02d" % (work_year, work_month)
        start = "%04d%02d" % (last_year, last_month)
        previous = "%04d%02d" % (previous_year, previous_month)
	start_filter = [{'property':'compounddate','greater_than':start},{'property':'compounddate','less_than':end}]
        deforested_asset = self.paint_deforestation(asset_id, work_month, work_year)
        json_cmd = {"creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.GetNDFIDelta","args": [
            self.last_period['start'] - year_msec,
            self.last_period['end'],
            self.work_period['start'],
            self.work_period['end'],
            "MODIS/MOD09GA",
            "MODIS/MOD09GQ",
            {'type':'FeatureCollection','table_id': 1868251, 'mark': str(timestamp()), 'filter':start_filter},
            {'type':'FeatureCollection','table_id': 1868251, 'mark': str(timestamp()), 
		'filter':[{"property":"month","equals":work_month},{"property":"year","equals":work_year}]},
            {'type':'FeatureCollection','table_id': 4468280, 'mark': str(timestamp()), 
		'filter':[{"property":"Compounddate","equals":int(previous)}]},
            {'type':'FeatureCollection','table_id': 4468280, 'mark': str(timestamp()), 
		'filter':[{"property":"Compounddate","equals":int(end)}]},
            deforested_asset,
            polygon,
            rows,
            cols]
        }
	logging.info("GetNDFIDelta")
	logging.info(json_cmd)
	return json_cmd


    def getMidMonth(self, start, end):
        middle_seconds = int((end + start) / 2000)
        this_time = time.gmtime(middle_seconds)
        return this_time[1]
      
    def getMidYear(self, start, end):
        middle_seconds = int((end + start) / 2000)
        this_time = time.gmtime(middle_seconds)
        return this_time[0]

    def mapid2(self, asset_id):
        cmd = {
            "image": json.dumps(self.mapid2_cmd(asset_id)),
            "format": 'png'

        }
        return self._execute_cmd('/mapid', cmd)


    def freeze_map(self, asset_id, table, report_id):
        """
        """
        base_image = {"creator": CALL_SCOPE + "/com.google.earthengine.examples.sad.ProdesImage", "args":[asset_id]};

        remapped = {"algorithm": "Image.remap", "image":base_image, 
          "from":[0,1,2,3,4,5,6,7,8,9], "to":[0,1,2,3,4,5,6,2,3,9]}

        def_image = self.paint_call(remapped, int(report_id), table, 7)

        selected_def = {"algorithm": "Image.select", "input": def_image, 
                        "bandSelectors":["remapped"]}

        deg_image = self.paint_call(selected_def, int(report_id), table, 8)

        renamed_image = {"algorithm": "Image.select", "input": deg_image, 
                        "bandSelectors":["remapped"], "newNames":["classification"]}

        clipped_image = {"creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.AddBB",
		"args":[renamed_image, asset_id, "classification"]}

        map_image = {"algorithm": "Image.addBands", "dstImg": asset_id, "srcImg": clipped_image,
                    "names": ["classification"], "overwrite": True}

        cmd = {"value": json.dumps(map_image)}

        return self._execute_cmd('/create', cmd)

    def paint_call(self, current_asset, report_id, table, value):
        return {
          "algorithm": "Image.paint", "image": current_asset,
          "featureCollection": {
            "table_id": int(table), "type": "FeatureCollection", 
            "filter":[{"property":"report_id","equals":int(report_id)},
                      {"property":"type", "equals": value}]},
          "color": value
        }
       
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
        # get map id from EE set long_span=1
        params = self._NDFI_period_image_command(self.last_period, 1)
        return self._execute_cmd('/mapid', params)

    def baseline(self):
        params = self._baseline_image_command()
        return self._execute_cmd('/mapid', params)

    def ndfi1id(self):
        # get map id from EE
        params = self._NDFI_period_image_command(self.work_period)
        return self._execute_cmd('/mapid', params)

    def rgb_strech(self, polygon, sensor, bands):
        # this is an special call, the application needs to call /value
        # before call /mapid in order to google earthn engine makes his work
        cmd = self._RGB_streched_command(self.work_period, polygon, sensor, bands)
        del cmd['bands']
        if (sensor=="modis"):
            cmd['fields'] = 'stats_sur_refl_b01,stats_sur_refl_b02,stats_sur_refl_b03,stats_sur_refl_b04,stats_sur_refl_b05'
        else:
            cmd['fields'] = 'stats_30,stats_20,stats_10'

        self._execute_cmd('/value', cmd)
        cmd = self._RGB_streched_command(self.work_period, polygon, sensor, bands)
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

    def ndfi_change_value(self, asset_id, polygon, rows=5, cols=5):
        img = self.mapid2_cmd(asset_id, polygon, rows, cols)
        cmd = {
            "image": json.dumps(img),
            "fields": 'ndfiSum'#','.join(fields)
        }
        return self._execute_cmd('/value', cmd)

    def ndfi_change_value_old(self, polygons, rows=5, cols=5):
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
            self.last_period,
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

    def _baseline_image(self):
        return {
            'creator': CALL_SCOPE + '/com.google.earthengine.examples.sad.ProdesImage',
            'args': ["Xy539pUtkRlazIO1"]
        }

    def _krig_filter(self, period):
        work_month = self.getMidMonth(period['start'], period['end'])
        work_year = self.getMidYear(period['start'], period['end'])
        end = "%04d%02d" % (work_year, work_month)
        filter = [{'property':'Compounddate','equals':int(end)}]
	return filter



    def _NDFI_image(self, period, long_span=0):
        """ given image list from EE, returns the operator chain to return NDFI image """
	filter = self._krig_filter(period)
        return {
            "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.NDFIImage',
            "args": [{
              "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.UnmixModis',
              "args": [{
                "creator": KRIGING,
                "args": [ self._MakeMosaic(period, long_span), 
			{'type':'FeatureCollection','table_id':4468280,
				'filter':filter,'mark':str(timestamp())} ]
              }]
            }]
         }

    def _change_detection_data(self, reference_period, work_period, polygons=[], cols=5, rows=5):
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


    def _NDFI_change_value(self, reference_period, work_period, polygons, cols=5, rows=5):
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

    def _NDFI_period_image_command(self, period, long_span=0):
        """ get NDFI command to get map of NDFI for a period of time """
        ndfi_image = self._NDFI_image(period, long_span)
        return {
            "image": json.dumps(ndfi_image),
            "bands": 'vis-red,vis-green,vis-blue',
            "gain": 1,
            "bias": 0.0,
            "gamma": 1.6
        }

    def _baseline_image_command(self):
        baseline_image = self._baseline_image()
        return {
            "image": json.dumps(baseline_image),
            "bands": 'classification',
            "min": 0,
            "max": 9
        }

    def _RGB_image_command(self, period):
        """ commands for RGB image """
	filter = self._krig_filter(period)
        return {
            "image": json.dumps({
               "creator": KRIGING,
               "args": [ self._MakeMosaic(period),{'type':'FeatureCollection','table_id':4468280,
			'filter':filter,'mark':str(timestamp())} ]
            }),
            "bands": 'sur_refl_b01,sur_refl_b04,sur_refl_b03',
            "gain": 0.1,
            "bias": 0.0,
            "gamma": 1.6
          };

    def _MakeMosaic(self, period, long_span=0):
        middle_seconds = int((period['end'] + period['start']) / 2000)
        this_time = time.gmtime(middle_seconds)
        month = this_time[1]
        year = this_time[0]
        yesterday = date.today() - timedelta(1)
        micro_yesterday = time.mktime(yesterday.timetuple()) * 1000000
        logging.info("month " + str(month))
        logging.info("year " + str(year))
        if long_span == 0:
          filter = [{'property':'month','equals':month},{'property':'year','equals':year}]
          start_time = period['start']
        else:
          start = "%04d%02d" % (year - 1, month)
          end = "%04d%02d" % (year, month)
          start_time = period['start'] - 1000 * 60 * 60 * 24 * 365
          filter = [{'property':'compounddate','greater_than':start},
		{'or': [{'property':'compounddate','less_than':end}, {'property':'compounddate','equals':end}]}]
        return {
          "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.MakeMosaic',
          "args": [{"id":"MODIS/MOD09GA","version":micro_yesterday,"start_time":start_time,"end_time":period['end']},
                   {"id":"MODIS/MOD09GQ","version":micro_yesterday,"start_time":start_time,"end_time":period['end']}, 
                   {'type':'FeatureCollection','table_id':1868251, 
                      'filter':filter,
                   start_time, period['end']]
        }

    def _SMA_image_command(self, period):
	filter = self._krig_filter(period)
        return {
            "image": json.dumps({
              "creator": CALL_SCOPE + '/com.google.earthengine.examples.sad.UnmixModis',
              "args": [{
                "creator": KRIGING,
                "args": [self._MakeMosaic(period), {'type':'FeatureCollection','table_id':4468280,'filter':filter}]
              }]
            }),
            "bands": 'gv,soil,npv',
            "gain": 256,
            "bias": 0.0,
            "gamma": 1.6
        };

    def _RGB_streched_command(self, period, polygon, sensor, bands):
     filter = self._krig_filter(period)
     if(sensor=="modis"):
        """ bands in format (1, 2, 3) """
        bands = "sur_refl_b0%d,sur_refl_b0%d,sur_refl_b0%d" % bands
        return {
            "image": json.dumps({
                "creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.StretchImage",
                "args":[{
                    "creator":"ClipToMultiPolygon",
                    "args":[
                    {
                        "creator":KRIGING,
                        "args":[ self._MakeMosaic(period), {'type':'FeatureCollection','table_id':4468280,
				'filter':filter}]
                    },
                    polygon]},
                 ["sur_refl_b01","sur_refl_b02","sur_refl_b03","sur_refl_b04","sur_refl_b05"],
                 2 
                 ]
            }),
            "bands": bands
        }
     else:
        three_months = timedelta(days=90)
        work_period_end   = self.work_period['end']
        work_period_start = self.work_period['start'] - 7776000000 #three_months
        yesterday = date.today() - timedelta(1)
        micro_yesterday = time.mktime(yesterday.timetuple()) * 1000000
	landsat_bands = ['10','20','30','40','50','70','80','61','62']
	creator_bands =[{'id':id, 'data_type':'float'} for id in landsat_bands]
        bands = "%d,%d,%d" % bands
        return {
            "image": json.dumps({
                "creator":CALL_SCOPE + "/com.google.earthengine.examples.sad.StretchImage",
                "args":[{
                    "creator":"LonLatReproject",
                    "args":[{
                       "creator":"SimpleMosaic",
                       "args":[{
                          "creator":"LANDSAT/LandsatTOA",
                          "input":{"id":"LANDSAT/L7_L1T","version":micro_yesterday},
                          "bands":creator_bands,
                          "start_time": work_period_start, #131302801000
                          "end_time": work_period_end }] #1313279999000
                    },polygon, 30]
                 },
                 landsat_bands,
                 2 
                 ]
            }),
            "bands": bands
        }

class Thumbnail(object):
    def __init__(self):
        self.ee = EarthEngine(settings.EE_TOKEN)
    def thumbid(self, id):
        MAP_IMAGE = {'id':id};
        MAP_IMAGE_BANDS = ['30','20','10'];
        cmd = {
            'getid':1,
            'image':urllib.quote_plus(json.dumps(MAP_IMAGE)),
            'bands':','.join(MAP_IMAGE_BANDS), #'30,20,10'
        }
        return self._execute_cmd("/thumb", cmd)
    def _execute_cmd(self, url, cmd):
        params = "&".join(("%s=%s"% v for v in cmd.iteritems()))
        return self.ee.get(url, params)
