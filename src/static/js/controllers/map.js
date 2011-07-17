

var MapView = Backbone.View.extend({
    mapOptions: {
                zoom: 5,
                center: new google.maps.LatLng(-7.409408064269147,-50.00213741352536),
                mapTypeId: google.maps.MapTypeId.TERRAIN,
                disableDefaultUI: true,
                disableDoubleClickZoom: true,
                draggableCursor:'default'
    },

    el: $("#map"),

    initialize: function() {
        _.bindAll(this, 'center_changed', 'tilesloaded');
       this.map = new google.maps.Map(this.el[0], this.mapOptions);
       google.maps.event.addListener(this.map, 'center_changed', this.center_changed);
       google.maps.event.addListener(this.map, 'tilesloaded', this.tilesloaded);
    },

    center_changed: function() {
            this.trigger('center_changed', this.map.getCenter());
    },

    tilesloaded: function() {
            // its needed to wait to tiles was rendered to
            // google maps call 'draw' on projector overlay and
            // getProjection can be called
            this.trigger('tilesloaded');
    }
});
