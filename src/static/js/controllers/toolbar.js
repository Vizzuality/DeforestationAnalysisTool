
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
                   // Hack to get red bar resizing
                    var size = $('a.ui-slider-handle:eq(1)').css('left');
                    $('span.hack_red').css('left',size);
                    var low = ui.values[0];
                    var high= ui.values[1];
                    self.slide(low, high);
                },
                create: function(event,ui) {
                    // Hack to get red bar resizing
                    var size = $('a.ui-slider-handle:eq(1)').css('left');
                    $('span.hack_red').css('left',size);
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
        this.compare = new ButtonGroup({el: this.$("#compare_buttons")});
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
        'click #done': 'done',
        'click #go_back': 'go_back',
        'click .notes': 'open_notes'
    },

    initialize: function() {
        _.bindAll(this, 'done', 'on_cell', 'select_mode', 'go_back', 'set_note_count');
        this.done = this.$('#done');
    },

    set_note_count: function(c) {
        this.$('.notes').html( c + " NOTE" + (c==1?'':'S'));
    },

    done: function(e) {
        e.preventDefault();
        this.trigger('done');
    },

    open_notes: function(e) {
        e.preventDefault();
        this.trigger('open_notes');
    },

    go_back: function(e) {
        e.preventDefault();
        this.trigger('go_back');
    },
    on_cell: function(x, y, z) {
        if(z == 2) {
            this.done.show();
            this.$('.notes').show();
        } else {
            this.$('.notes').hide();
        }
        var text = "Global map";
        if(z > 0) {
            text = "Cell " + z + "/" + x + "/" + y + " - ";
            this.$("#go_back").show();
        } else {
            this.$("#go_back").hide();
        }
        this.$("#current_cell").html(text);
    },

    select_mode: function() {
        this.done.hide();
    }


});
