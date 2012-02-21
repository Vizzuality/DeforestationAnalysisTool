
import sys
try:
    import simplejson as json
except:
    import json
import urllib2
from time_utils import month_range

assets_id = [
#'SAD_VALIDATED/SAD_2009_08',
#'SAD_VALIDATED/SAD_2009_09',
#'SAD_VALIDATED/SAD_2009_10',
#'SAD_VALIDATED/SAD_2009_11',
#'SAD_VALIDATED/SAD_2009_12',
#'SAD_VALIDATED/SAD_2010_01',
#'SAD_VALIDATED/SAD_2010_02',
#'SAD_VALIDATED/SAD_2010_05',
#'SAD_VALIDATED/SAD_2010_06',
#'SAD_VALIDATED/SAD_2010_07',
#'SAD_VALIDATED/SAD_2010_08',
#'SAD_VALIDATED/SAD_2010_09',
#'SAD_VALIDATED/SAD_2010_10',
#'SAD_VALIDATED/SAD_2010_11',
#'SAD_VALIDATED/SAD_2010_12',
#'SAD_VALIDATED/SAD_2011_01',
#'SAD_VALIDATED/SAD_2011_02',
#'SAD_VALIDATED/SAD_2011_03',
#'SAD_VALIDATED/SAD_2011_04',
#'SAD_VALIDATED/SAD_2011_05',
#'SAD_VALIDATED/SAD_2011_06',
#'SAD_VALIDATED/SAD_2011_07',
#'SAD_VALIDATED/SAD_2011_08',
#'SAD_VALIDATED/SAD_2011_09',
#'SAD_VALIDATED/SAD_2011_10',
#'SAD_VALIDATED/SAD_2011_11',
#'SAD_VALIDATED/SAD_2011_12'
]

print "assetid,report_id"
for r in assets_id:
    first, last = month_range(*reversed(map(int, r.split('_')[-2:])))
    url =  "http://%s/_ah/cmd/create_report?year=%d&month=%d&day=%d&assetid=%s&fyear=%d&fmonth=%d&fday=%d""" % (sys.argv[1], first.year, first.month, first.day, r, last.year, last.month, last.day)
    print url
    print r, ",", json.loads(urllib2.urlopen(url, "fake=data").read())['fusion_tables_id']
    #print """curl -d '' "http://localhost:8080/_ah/cmd/create_report?year=%d&month=%d&day=%d&assetid=%s&fyear=%d&fmonth=%d&fday=%d""" % (first.year, first.month, first.day, r, last.year, last.month, last.day)
