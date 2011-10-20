
// contains stats for a region
// each region is defined by a table_id and
// a name which is an string
var ReportStat = Backbone.Model.extend({
    url: function() {
        return '/api/v0/report/' + this.get('id') + '/stats';
    }
});

/*
 ========================================
 store all statictics in the cliend side. Take this class
 as a memcache in client side
 ========================================
*/
var ReportStatCollection = Backbone.Collection.extend({

    model: ReportStat,

    fetch_periods: function(periods, callback) {
        var self = this;
        // remove already cached
        var to_fetch = _(periods).filter(function(p) {
            return self.get(p) === undefined;
        });
        if(to_fetch.length === 0) {
            callback();
            return;
        }
        window.loader.loading("reportstatcollection", "loading stats, 1/" + to_fetch.length);
        // fetch them
        var callback_after = _.after(to_fetch.length,function() {
            window.loader.finished();
            callback();
        });
        var count = 0;
        _.each(to_fetch, function(report) {
            var rstats = new ReportStat({id: report.id});
            self.add(rstats);
            //TODO: error control
            rstats.fetch({success: function() {
                count ++;
                window.loader.set_msg("loading stats, " + count + "/" + to_fetch.length);
                callback_after();
            }
            });
        });
    },

    stats_for_periods: function(periods, key, callback) {
        var self = this;
        self.fetch_periods(periods, function() {
            var def = 0;
            var deg = 0;
            var total_area = 0;
            _(periods).each(function(p) {
                var st = self.get(p).get('stats')[key];
                def += parseFloat(st.def);
                deg += parseFloat(st.deg);
                total_area += st.total_area;
            });
            callback({'def': def.toFixed(2),
                      'deg': deg.toFixed(2),
                      'total_area': total_area.toFixed(1)});
        });
        return this;
    }
});

// model used to return stats for a given poly
var PolygonStat = Backbone.Model.extend({
    url: function() {
        return '/api/v0/stats/polygon';
    },
    get_csv: function() {
        $.post(this.url() + '/csv',
            this.attributes
        );
    }
});

/*
 ========================================
 ========================================
*/

var PolygonStatCollection = Backbone.Collection.extend({

    model: PolygonStat,

    initialize: function(models, options) {
        this.polygon_path = options.polygon_path;
        this.reports = options.reports;
    },

    stats: function(callback) {
        var self = this;
        var report_ids = _.pluck(this.reports, 'id');
        var poly = new PolygonStat({
            polygon: self.polygon_path,
            reports: report_ids
        });
        poly.save(null, {
            success: function(model) {
                callback({
                    def: model.get('def').toFixed(2),
                    deg: model.get('def').toFixed(2),
                    total_area: model.get('total_area').toFixed(2)});
            }
        });
    }
});


