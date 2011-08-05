
// this is a helper class to map cell points to
// real map positions
var Mapper = Backbone.Model.extend({

    defaults: {
        'swlat':-18.47960905583197,
        'swlon': -74.0478515625,
        'nelat': 5.462895560209557,
        'nelon': -43.43994140625
    },

    initialize: function() {
        this.bounds = new google.maps.LatLngBounds(
            new google.maps.LatLng(
               this.get('swlat'),
               this.get('swlon')
            ),
            new google.maps.LatLng(
               this.get('nelat'),
               this.get('nelon')
            )
        );
    },


    // return cell pixel position
    // ** be careful with precision madness **
    // ** will not work for z > 3 depending on split size **
    cell_position: function(x, y, z) {
        if(this.projector === undefined) {
            throw "you must set mapper.projector before doing any call";
        }
        var righttop = this.projector.transformCoordinates(this.bounds.getNorthEast());
        var leftbottom = this.projector.transformCoordinates(this.bounds.getSouthWest());
        var topx = leftbottom.x;
        var topy = righttop.y;
        var w = righttop.x - leftbottom.x;
        var h = -righttop.y + leftbottom.y;
        var sp = Math.pow(SPLITS, z);
        var sx = w/sp;
        var sy = h/sp;
        return {
            rx: x*sx, //relative position to bounds corner
            ry: y*sy,
            x: x*sx + topx,
            y: y*sy + topy,
            width: sx,
            height: sy
        };
    },

    // given cell zyz return cell bounds
    cell_bounds: function(x, y, z) {
        var cell_pos = this.cell_position(x, y, z);
        return new google.maps.LatLngBounds(
            this.projector.untransformCoordinates(
                new google.maps.Point(cell_pos.x, cell_pos.y + Math.ceil(cell_pos.height))
            ),
            this.projector.untransformCoordinates(
                new google.maps.Point(cell_pos.x + Math.ceil(cell_pos.width), cell_pos.y)
            )
        );
    }

});

