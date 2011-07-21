
var PolygonView = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'click', 'remove');
        this.mapview = this.options.mapview;
    },

    render: function() {
        // conversion
        var poly = new google.maps.Polygon({
                paths: this.model.paths(),
                strokeWeight: 1
        });
        poly.setMap(this.mapview.map);
        google.maps.event.addListener(poly, 'click', this.click);
        this.poly = poly;
    },

    click: function(event) {
        var infowindow = new google.maps.InfoWindow();
        infowindow.setContent(this.model.get('type') == 1 ? "deforestation":"degradation");
        infowindow.setPosition(event.latLng);
        infowindow.open(this.mapview.map);
    },

    remove: function() {
        this.poly.setMap(null);
    }

});


var CellPolygons = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'remove', 'add', 'addAll', 'commit');
        this.mapview = this.options.mapview;
        this.report = this.options.report;
        this.poly_views = [];
        this.polygons = new PolygonCollection({
            report: this.report,
            x: this.options.x,
            y: this.options.y,
            z: this.options.z
        });
        this.polygons.bind('add', this.add);
        this.polygons.bind('reset', this.addAll);
        this.polygons.fetch();

    },

    add: function(poly) {
        var p = new PolygonView({model: poly, mapview: this.mapview});
        p.render();
        this.poly_views.push(p);
    },

    create: function() {
        throw "use commit if you want to save models";
    },

    addAll: function() {
        this.polygons.each(this.add);
    },

    // remove all polygons from map
    remove: function() {
        _.each(this.poly_views, function(p) {
            p.remove();
        });
    },

    commit: function() {
        var finished = function () {
            console.log("finished");
            window.loading.finished();
        };
        this.polygons.each(function(p) {
            window.loading.loading();
            p.save(null, {
                success: finished,
                error: finished
            });
        });
    }


});
