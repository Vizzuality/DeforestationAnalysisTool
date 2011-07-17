

var MapView = Backbone.View.extend({

    el: $("#map"),

    initialize: function() {
        var mapOptions = {
                zoom: 5,
                center: new google.maps.LatLng(-7.409408064269147,-50.00213741352536),
                mapTypeId: google.maps.MapTypeId.SATELLITE,
                disableDefaultUI: true,
                disableDoubleClickZoom: true,
                draggableCursor:'default'
       };
       this.map = new google.maps.Map(this.el[0], mapOptions);
    }
});
