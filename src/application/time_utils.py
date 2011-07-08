
import time
from datetime import datetime, timedelta

def timestamp(d):
    """ return timestamp from datetime in milliseconds """
    return int(time.mktime(d.timetuple())*1000)

def first_of_current_month(now=None):
    """
    >>> d = datetime.datetime(2005, 7, 14, 12, 30)
    >>> first_of_current_month(d)
    datetime.datetime(2005, 7, 1, 12, 30)
    """
    now = now or datetime.now()
    return timestamp(now - timedelta(days=now.day-1))
