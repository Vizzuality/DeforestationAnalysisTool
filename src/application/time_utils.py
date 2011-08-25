
from dateutil.relativedelta import *

import time
from datetime import datetime, timedelta, date

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

def past_month_range(now):
    today = date(now.year, now.month, now.day)
    d = today - relativedelta(months=1)
    return map(timestamp,
            (date(d.year, d.month, 1),
            date(today.year, today.month, 1) - relativedelta(days=1)))

def month_range(month, year):
    start = date(year, month, 1)
    end = start + relativedelta(months=1)
    end = date(end.year, end.month, 1) - relativedelta(days=1)
    return (start, end)

def date_from_julian(n, year):
    return date(year, 1, 1) + relativedelta(days=n)
