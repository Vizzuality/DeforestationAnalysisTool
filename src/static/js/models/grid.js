
var Cell = Backbone.Model.extend({

    defaults: {
        //TODO: remove this values from model
        top: 0,
        left: 0,
        width: 0,
        height: 0,
        //end TODO
        background: "rgba(0, 0, 0, 0.5)",
        swlat: 0.0,
        swlon: 0.0,
        nelat: 0.0,
        nelon: 0.0
    },

    // return cell bounds (google.maps.LatLngBounds)
    bounds: function() {
        return new google.maps.LatLngBounds(
                new google.maps.LatLng(this.get('swlat'), this.get('swlon')),
                new google.maps.LatLng(this.get('nelat'), this.get('nelon'))
        );
    }
});


var Cells = Backbone.Collection.extend({
    model: Cell,

    initialize: function(models, options) {
        this.bounds = options.bounds;
        this.projector = options.projector;
        this.calc_projection();
    },

    bounds_for_cell: function(x, y, w, h) {
        return new google.maps.LatLngBounds(
            this.projector.untransformCoordinates(
                new google.maps.Point(x, y + Math.ceil(h))
            ),
            this.projector.untransformCoordinates(
                new google.maps.Point(x + Math.ceil(w), y)
            )
        );
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
                var b = this.bounds_for_cell(x + sx*i, y + sy*j, sx, sy);
                cells.push({
                    top: sy*j,
                    left: sx*i,
                    width: sx,
                    height: sy,
                    swlat: b.getSouthWest().lat(),
                    swlon: b.getSouthWest().lng(),
                    nelat: b.getNorthEast().lat(),
                    nelon: b.getNorthEast().lng()
                });
            }
        }
        this.reset(cells);
    },

    calc_projection: function() {
        var righttop = this.projector.transformCoordinates(this.bounds.getNorthEast());
        var leftbottom = this.projector.transformCoordinates(this.bounds.getSouthWest());
        this.x = leftbottom.x;
        this.y = righttop.y;
        this.w = righttop.x - leftbottom.x;
        this.h = - righttop.y + leftbottom.y;
    }
});
