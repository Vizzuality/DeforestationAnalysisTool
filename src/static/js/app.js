
$(function() {

    // application
    var IMazon = Backbone.View.extend({

        amazon_bounds: new google.maps.LatLngBounds(
            new google.maps.LatLng(-18.47960905583197, -74.0478515625),
            new google.maps.LatLng(5.462895560209557, -43.43994140625)
        ),

        initialize:function() {
            this.map = new MapView();
            this.grid = new Grid({
                mapview: this.map,
                el: $("#grid"),
                bounds: this.amazon_bounds
            });
        }
    });

    var app = new IMazon();

});
