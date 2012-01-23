"""
report_types.py

Classes for describing different report formats.

"""

import logging
import csv
from application import settings
from google.appengine.ext import deferred
from datetime import datetime, date
from dateutil.relativedelta import relativedelta
from ft import FT
from flask import Response, abort, request
from StringIO import StringIO
from models import FustionTablesNames, StatsStore, FusionTablesPolygons


class ReportType(object):

    zone = None

    def init(self, zone):
        self.f.truncate(0)
        self.zone = zone
   
    def set_zone(self):
        self.zone = zone
    
    def write_row(self, report, table=None, kml=None):
        raise NotImplementedError

    def write_header(self):
        raise NotImplementedError

    def write_footer(self):
        raise NotImplementedError

    def value(self):
        raise NotImplementedError

    def response(self, file_name):
        raise NotImplementedError

    def get_stats(self, report, table):
        report_id = str(report.key())
        st = StatsStore.get_for_report(report_id)
        if not st:
           logging.error("no cached stats for %s" % report_id)
           abort(404)

        if self.zone:
            stats = st.table_accum(table, self.zone)
            if not stats:
                logging.error("no stats for %s" % report_id)
                abort(404)
        else:
            stats = st.for_table(table)
            if not stats:
                logging.error("no stats for %s" % report_id)
                abort(404)
        return stats
    
    @staticmethod
    def factory(format):
        if (format == "kml"):
            return KMLReportType()
        else:
            return CSVReportType()
      
        

class CSVReportType(ReportType):

    f = StringIO()
    csv_file = csv.writer(f)

    def write_header(self):
        if self.zone:
            self.csv_file.writerow(('report_id', 'start_date', 'end_date', 'deforested', 'degraded'))
        else:
            self.csv_file.writerow(('report_id', 'start_date', 'end_date', 'zone_id', 'deforested', 'degraded'))

    def write_footer(self):
        pass    

    def write_row(self, report, stats, table=None, kml=None):
        name = None

        if table and not self.zone:
            table_names = FustionTablesNames.all().filter('table_id =', table).fetch(1)[0].as_dict()
            name = table_names.get(stats['id'], stats['id'])
            
        if name:
            self.csv_file.writerow((str(report.key().id()),
                    report.start.isoformat(),
                    report.end.isoformat(),
                    name,
                    stats['def'],
                    stats['deg']))
        else:
            self.csv_file.writerow((str(report.key().id()),
                    report.start.isoformat(),
                    report.end.isoformat(),
                    stats['def'],
                    stats['deg']))
        

    def value(self):
        return self.f.getvalue()

    def response(self, file_name):
        result = self.value()
        self.f.truncate(0)
        return Response(result, 
            headers={
                "Content-Disposition": "attachment; filename=\"" + file_name + ".csv\""
            },
            mimetype='text/csv')

class KMLReportType(ReportType):

    f = StringIO()

    def write_header(self):
        self.f.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
        self.f.write("<kml xmlns=\"http://www.opengis.net/kml/2.2\">")
        self.f.write("<Document>")
        self.f.write("<Style id=\"transGreenPoly\"><LineStyle><width>2.5</width></LineStyle><PolyStyle><color>3d00ff00</color></PolyStyle>")
        self.f.write("<BalloonStyle><text>$[description]</text></BalloonStyle></Style>")

    def write_footer(self):
        self.f.write("</Document>")
        self.f.write("</kml>")

    def write_row(self, report, stats, table=None, kml=None):
        name = None

        if table:
          table_names = FustionTablesNames.all().filter('table_id =', table).fetch(1)[0].as_dict()
          name = table_names.get(stats['id'], stats['id'])
          kml = self.kml(table, stats['id'])
        else:
          name = "Custom Polygon"

        description = self.description(name, stats)

        self.f.write("<Placemark>")
        self.f.write("<styleUrl>#transGreenPoly</styleUrl>")
        self.f.write("<name>" + name + "</name>")
        self.f.write("<description>" + description + "</description>")
        self.f.write(kml)
        self.f.write("</Placemark>")

    def value(self):
        return self.f.getvalue()

    def response(self, file_name):
        result = self.value()
        self.f.truncate(0)
        return Response(result, 
            headers={
                "Content-Disposition": "attachment; filename=\"" + file_name + ".kml\""
            },
            mimetype='text/kml')

    def kml(self, table, row_id):
        cl = FT(settings.FT_CONSUMER_KEY,
                settings.FT_CONSUMER_SECRET,
                settings.FT_TOKEN,
                settings.FT_SECRET)

        #TODO: do this better
        if (table == 1568452):
          id = 'ex_area'
        else:
          id = 'name'

        info = cl.sql("select geometry from %s where %s = %s" % (table, id, row_id))
        polygon = info.split('\n')[1]
        polygon = polygon.replace("\"", "")
        return polygon

    def description(self, name, stats):
        desc = "<![CDATA[<table><tr><td><h2>" + name + "</h2></td><td></td></tr><tr><td><b>Deforestation: </b></td><td>" + str(stats['def']) + "km<sup>2</sup></td></tr><tr><td><b>Degradation: </b></td><td>" + str(stats['deg']) + "km<sup>2</sup></td></tr></table>]]>"
        return desc


        
      

