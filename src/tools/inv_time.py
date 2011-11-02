
import sys

from datetime import datetime

print datetime.fromtimestamp(int(sys.argv[1])/1000).isoformat()
