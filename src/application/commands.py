

from application import app

from application import settings
from ft import FT

@app.route('/_ah/cmd/create_table')
def create_table():
    cl = FT(settings.FT_CONSUMER_KEY, 
            settings.FT_CONSUMER_SECRET,
            settings.FT_TOKEN,
            settings.FT_SECRET)
    table_desc = {'areas': {
       'added_on': 'DATETIME',
       'type': 'NUMBER', 
       'geo': 'LOCATION'
    }}

    return str(cl.create_table(table_desc))
    
@app.route('/_ah/cmd/show_tables')
def show_tables():
    cl = FT(settings.FT_CONSUMER_KEY, 
            settings.FT_CONSUMER_SECRET,
            settings.FT_TOKEN,
            settings.FT_SECRET)
    return '\n'.join(map(str, cl.get_tables()))

