
var SPLITS = 10;

var Cell = Backbone.Model.extend({

    defaults: {
        //TODO: remove this values from model
        x:0,
        y:0,
        z:0,
        background: "rgba(0, 0, 0, 0.5)"
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
        return "/api/v0/report/" + this.report.id + "/cell/" + this.z + "_" + this.x + "_" + this.y;
    }

});
