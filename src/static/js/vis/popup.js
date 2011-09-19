
//
// map popup that shows degradation and deforestation stats
var MapPopup = Backbone.View.extend({

    el: $(".map_container #popup"),

    events: {
        'click #popup_close': 'close'
    },

    initialize: function() {
        _.bindAll(this, 'showAt');
    },

    // shows the popup with info
    showAt: function(pos, title, total_area, area_def, area_deg) {
        var el = this.el;
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
    }

});
