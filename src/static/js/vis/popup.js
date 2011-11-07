
//
// map popup that shows degradation and deforestation stats
//
var MapPopup = Backbone.View.extend({

    el: $(".map_container #popup"),

    events: {
        'click #popup_close': 'close',
        'click button': 'show_report'
    },

    initialize: function() {
        _.bindAll(this, 'showAt', 'show_report', 'pos', 'reposition', 'close');
        var self = this;
        this.map = this.options.map;
        this.map.bind('center_changed', this.reposition);
        this.map.bind('zoom_changed', this.close);
    },

    // shows the popup with info
    showAt: function(pos, table, zone, title, total_area, area_def, area_deg, polygon) {
        var el = this.el;
        this.table = table;
        this.zone = zone;
        this.description = title;
        this.polygon = polygon;
        this.pos(pos);
        this.$('h1').html(title);
        this.$('.area').html(total_area.toFixed(2));
        function set_area(el, el_area, area) {
            if(area < 0.01) {
                self.$(el).html((1000*area).toFixed(1));
                self.$(el_area).html('m<sup>2</sup>');
            } else {
                self.$(el).html(area.toFixed(2));
                self.$(el_area).html('km<sup>2</sup>');
            }
        }
        set_area('.area_def', '.metric_def', area_def);
        set_area('.area_deg', '.metric_deg', area_deg);
        el.show();
        this.position = pos;
    },

    reposition: function() {
        var self = this;
        if(self.position !== undefined) {
            self.pos(self.position);
        }
    },

    pos: function(latLng) {
        var p = this.map.projector.transformCoordinates(latLng);
        this.el.css({top: p.y - 165, left: p.x - 102});
    },

    close: function(e) {
        if(e && e.preventDefault) e.preventDefault();
        this.el.hide();
    },

    show_report: function(e) {
        if(e) e.preventDefault();
        this.trigger('show_report', {
            table: this.table,
            zone: this.zone,
            name: this.description,
            polygon: this.polygon
        });
    }

});
