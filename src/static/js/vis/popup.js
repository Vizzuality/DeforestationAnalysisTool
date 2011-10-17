
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
        this.$('.area').html(total_area);
        this.$('.area_def').html(area_def);
        this.$('.area_deg').html(area_deg);
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
        if(e && e.hasOwnProperty('preventDefault')) e.preventDefault();
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
