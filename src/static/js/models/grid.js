
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
    },

    // this function is a helper to calculate subcells at this level
    populate_cells: function() {
        var cells = [];
        for(var i = 0; i < SPLITS; ++i) {
            for(var j = 0; j < SPLITS; ++j) {
                cells.push({
                    z: this.z + 1,
                    x: Math.pow(SPLITS, this.z)*this.x + i,
                    y: Math.pow(SPLITS, this.z)*this.y + j
                });
            }
        }
        this.reset(cells);
    }

});
