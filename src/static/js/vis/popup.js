
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
        _.bindAll(this, 'showAt', 'show_report');
    },

    // shows the popup with info
    showAt: function(pos, table, zone, title, total_area, area_def, area_deg) {
        var el = this.el;
        this.table = table;
        this.zone = zone;
        this.description = title;
        el.css({top: pos.y - 165, left: pos.x - 102});
        this.$('h1').html(title);
        this.$('.area').html(total_area);
        this.$('.area_def').html(area_def);
        this.$('.area_deg').html(area_deg);
        el.show();
    },

    close: function(e) {
        if(e) e.preventDefault();
        this.el.hide();
    },
    
    show_report: function(e) {
        if(e) e.preventDefault();
        this.trigger('show_report', {
            table: this.table,
            zone: this.zone,
            name: this.description
        });
    }

});
