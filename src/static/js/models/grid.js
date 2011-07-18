
var Cell = Backbone.Model.extend({
    defaults: {
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        background: "rgba(0, 0, 0, 0.5)"
    }
});


var Cells = Backbone.Collection.extend({
    model: Cell,
    
    initialize: function(models, options) {
        this.bounds = options.bounds;
        this.projector = options.projector;
    },

    // this function is a helper to calculate subcells at this level
    populate_cells: function() {
        var righttop = this.projector.transformCoordinates(this.bounds.getNorthEast());
        var leftbottom = this.projector.transformCoordinates(this.bounds.getSouthWest());
        var x = leftbottom.x;
        var y = righttop.y;
        var w = righttop.x - leftbottom.x;
        var h = - righttop.y + leftbottom.y;
        sp = 10;
        var sx = w/sp;
        var sy = h/sp;
        var cells = [];
        for(var i=0; i < sp;++i) {
            for(var j=0; j < sp;++j) {
                cells.push({
                    top: sy*j,
                    left: sx*i,
                    width: sx,
                    height: sy 
                });
            }
        }
        this.reset(cells);
    }
});
