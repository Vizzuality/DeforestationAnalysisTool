
var PolygonView = new Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'click');
        this.mapview = this.options.mapview;
    },

    render: function() {
        this.poly = new google.maps.Polygon({
                paths: this.model.get('paths'),
                strokeWeight: 1
        });
        this.poly.setMap(this.mapview.map);
        google.maps.event.addListener(poly, 'click', this.click);
    },

    click: function(event) {
        var infowindow = new google.maps.InfoWindow();
        infowindow.setContent(this.get('type') == 1 ? "deforestation":"degradation");
        infowindow.setPosition(event.latLng);
        infowindow.open(this.mapview.map);
    }

});
