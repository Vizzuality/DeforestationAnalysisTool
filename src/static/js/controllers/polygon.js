
var PolygonView = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'click', 'remove');
        this.mapview = this.options.mapview;
        this.model.bind('destroy', this.remove);
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
        /*var infowindow = new google.maps.InfoWindow();
        infowindow.setContent(this.model.get('type') == 1 ? "deforestation":"degradation");
        infowindow.setPosition(event.latLng);
        infowindow.open(this.mapview.map);
        */
        this.trigger('click', this);
    },

    remove: function() {
        this.poly.setMap(null);
        // javascript FTW
        this.view.poly_views.splice(this.view.poly_views.indexOf(this), 1);
    }

});


var CellPolygons = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'remove', 'add', 'addAll', 'commit', 'click_on_polygon', 'remove_poly');
        this.mapview = this.options.mapview;
        this.report = this.options.report;
        this.poly_views = [];
        this.polygons = new PolygonCollection({
            report: this.report || '',
            x: this.options.x || 0,
            y: this.options.y || 0,
            z: this.options.z || 0
        });
        this.polygons.bind('add', this.add);
        this.polygons.bind('reset', this.addAll);
        this.polygons.bind('remove', this.remove_poly);
    //    this.polygons.fetch();
        this.editing_state = false;

    },

    add: function(poly) {
        var p = new PolygonView({model: poly, mapview: this.mapview});
        p.view = this;
        p.render();
        p.bind('click', this.click_on_polygon);
        this.poly_views.push(p);
    },

    create: function() {
        throw "use commit if you want to save models";
    },

    remove_poly: function(poly) {
        console.log('removing poly');
    },

    addAll: function() {
        this.polygons.each(this.add);
    },

    // called when user clicks on polygon
    click_on_polygon: function(poly) {
        if(this.editing_state) {
            var p = poly.model;
            // if is commited, remove it
            // or remove manually from collection
            p.destroy();
            /*
            if(!p.isNew()) {
            } else {
               this.polygons.remove(p);
            }
            */
        }
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
            window.loading.finished('polygons:commit');
        };
        this.polygons.each(function(p) {
            window.loading.loading('polygons:commit');
            p.save(null, {
                success: finished,
                error: finished
            });
        });
    }


});
