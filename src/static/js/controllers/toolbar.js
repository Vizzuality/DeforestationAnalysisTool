
var Toolbar = Backbone.View.extend({

    show: function() {
        this.el.show();
    },

    hide: function() {
        this.el.hide();
    }
});

var PressedButton = Backbone.View.extend({

    events: {
        "click": 'press'
    },

    initialize: function() {
        _.bindAll(this, 'press');
        this.pressed = false;
    },

    press: function(e) {
        if(this.pressed) {
            this.el.removeClass('selected');
        } else {
            this.el.addClass('selected');
        }
        this.pressed = !this.pressed;
        this.trigger('change', this, this.pressed);
        e.preventDefault();
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

var ButtonGroup = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'show', 'hide', 'select');
        var self = this;
        this.buttons = this.$('.button').click(function(e) { self.click($(this), e); });
    },

    click: function(button, event) {
        this.buttons.removeClass('selected');
        button.addClass('selected');
        event.preventDefault();
        this.trigger('state', button.attr('id'));
    },

    select: function(opt) {
        var button = this.$("#" + opt);
        this.buttons.removeClass('selected');
        button.addClass('selected');
        this.trigger('state', button.attr('id'));
    },

    show: function() {
        this.el.show();
    },

    hide: function() {
        this.el.hide();
    }
});

var PolygonToolbar = Toolbar.extend({

    el: $("#work_toolbar"),


    initialize: function() {
        _.bindAll(this, 'change_state');
        this.buttons = new ButtonGroup({el: this.$('#selection')});
        this.polytype = new ButtonGroup({el: this.$('#polytype')});
        this.ndfi_range = new RangeSlider({el: this.$("#ndfi_slider")});
        this.compare = new PressedButton({el: this.$("#compare")});
        this.polytype.hide();
        this.buttons.bind('state', this.change_state);
    },

    change_state: function(st) {
        this.trigger('state', st);
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
