
$(function() {

    var Rutes = Backbone.Router.extend({
      routes: {
        "cell/:z/:x/:y":   "cell"
      },
      cell: function(z, x, y) {
        //console.log(z, x, y);
      }
    });

    var router = new Rutes();

    // application
    var IMazon = Backbone.View.extend({

        amazon_bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(-18.47960905583197, -74.0478515625),
            new google.maps.LatLng(5.462895560209557, -43.43994140625)
        ),

        initialize:function() {
            _.bindAll(this, 'to_cell', 'start');

            //Backbone.history.start({pushState: true});
            this.map = new MapView();
            this.gridstack = new GridStack({
                mapview: this.map,
                el: $("#grid"),
                initial_bounds: this.amazon_bounds
            });
            this.gridstack.grid.bind('enter_cell', function(cell) {
                router.navigate('cell/' +  cell.get('z') + "/" + cell.get('x') + "/" + cell.get('y'));
            });
            router.bind('route:cell', this.to_cell);
            this.map.bind('ready', this.start);
            
        },
        
        // this function is called when map is loaded
        // and all stuff can start to work.
        // do *NOT* perform any operation over map before this function
        // is called
        start: function() {
            this.map.map.setCenter(this.amazon_bounds.getCenter());
            router.navigate('cell/0/0/0');
            Backbone.history.start();
            console.log(" === App started === ");
        },

        to_cell:function (z, x, y) {
            console.log(z, x, y);
            this.gridstack.enter_cell(parseInt(x, 10), parseInt(y, 10), parseInt(z, 10));
        }

    });


    //setup global object to centralize all projection operations
    window.mapper = new Mapper();
    var app = new IMazon();


});
