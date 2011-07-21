
var Toolbar = Backbone.View.extend({

    show: function() {
        this.el.show();
    },

    hide: function() {
        this.el.hide();
    }
});


// jqueryui slider wrapper
// triggers change with values
var RangeSlider = Backbone.View.extend({

    initialize: function() {
        var self = this;
        this.el.slider({
                range: true,
                min: 0,
                max: 200,
                values: [40, 60], //TODO: load from model
                slide: function(event, ui) {
                    var low = ui.values[0];
                    var high= ui.values[1];
                    self.slide(low, high);
                }
         });
    },

    slide: function(low, high) {
        this.trigger('change', low, high);
    }
});

var ReportToolbar = Toolbar.extend({

    el: $("#range_select"),

    initialize: function() {
    }

});

var PolygonToolbar = Toolbar.extend({

    el: $("#work_toolbar"),

    initialize: function() {
        this.ndfi_range = new RangeSlider({el: this.$("#ndfi_slider")});
    }

});

var Overview = Backbone.View.extend({

    el: $("#overview"),

    events: {
        'click #done': 'done'
    },

    initialize: function() {
        _.bindAll(this, 'done', 'on_cell', 'select_mode');
        this.done = this.$('#done');
    },

    done: function(e) {
        e.preventDefault();
        this.trigger('done');
    },

    on_cell: function(x, y, z) {
        this.done.show();
    },

    select_mode: function() {
        this.done.hide();
    }


});
