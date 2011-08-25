
var SPLITS = 10;

var Cell = Backbone.Model.extend({

    defaults: {
        //TODO: remove this values from model
        x:0,
        y:0,
        z:0,
        background: "rgba(0, 0, 0, 0.5)"
    },

    parent_cell: function() {
        return new Cell({
            report_id: this.get('report_id'),
            z: this.get('z') - 1,
            x: Math.floor(this.get('x')/SPLITS),
            y: Math.floor(this.get('y')/SPLITS)
        });
    },

    has_changes: function() {
         return this.get('latest_change') > 0 && this.get('added_by') != 'Nobody';
         //return this.get('polygon_count') > 0;
    },

    ndfi_change: function() {
        var t = this.get('ndfi_change_value');
        t = Math.min(1.0, t);
        return t;
    },

    url: function() {
        return "/api/v0/report/" + this.get('report_id') + "/cell/" + this.get('z') + "_" + this.get('x') + "_" + this.get('y');
    },

    // ok, sorry, i'm not going to use backbone sync stuff
    // only get this information when its needed
    landstat_info: function(callback) {
        var self = this;
        if(self._landstat_info === undefined) {
            var url = this.url() + "/landsat";
            $.get(url, function(data) {
                self._landstat_info = data;
                self.trigger('landsat_info', self._landsat_info);
                if(callback) {
                    callback(data);
                }
            });
        } else {
            self.trigger('landsat_info', self._landsat_info);
            if(callback) {
                callback(self._landstat_info);
            }
        }
    }

});


var Cells = Backbone.Collection.extend({

    model: Cell,

    initialize: function(models, options) {
        this.x = options.x;
        this.y = options.y;
        this.z = options.z;
        this.report = options.report;
    },

    // this function is a helper to calculate subcells at this level
    populate_cells: function() {
        this.fetch();
    },

    url: function() {
        return "/api/v0/report/" + this.report.id + "/cell/" + this.z + "_" + this.x + "_" + this.y + "/children";
    }

});
