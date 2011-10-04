
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
        var to_fetch = _(periods).filter(function(p) {
            return self.get(p) === undefined;
        });
        if(to_fetch.length === 0) {
            callback();
        }
        // fetch them
        var callback_after = _.after(to_fetch.length, callback);
        _.each(to_fetch, function(report) {
            var rstats = new ReportStat({id: report.id});
            self.add(rstats);
            //TODO: error control
            rstats.fetch({success: callback_after});
        });
    },

    stats_for_periods: function(periods, key, callback) {
        var self = this;
        self.fetch_periods(periods, function() {
            var def = 0;
            var deg = 0;
            //var total_area = 0;
            _(periods).each(function(p) {
                var st = self.get(p).get('stats')[key];
                def += parseFloat(st.def);
                deg += parseFloat(st.deg);
                //total_area += st.total_area;
            });
            callback({'def': def.toFixed(2), 'deg': deg.toFixed(2)});
        });
        return this;
    }
});

// model used to return stats for a given poly
var PolygonStat = Backbone.Model.extend({
    url: function() {
        return '/api/v0/report/' + this.get('report_id') + '/stats/polygon';
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
        var callback_after = _.after(self.reports.length, function(){
             // agregate
             var def = 0, deg = 0;
             self.each(function(p) {
                def += p.get('def');
                deg += p.get('deg');
             });
             callback({def: def, deg: def});
        });
        _(this.reports).each(function(r) {
            var poly = new PolygonStat({
                report_id: r.id,
                polygon: self.polygon_path
            });
            self.add(poly);
            poly.save(null, {success:callback_after});
        });
    }
});


