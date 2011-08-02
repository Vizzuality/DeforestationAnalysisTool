
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
                    // Hack for handles tooltip
                    var size0 = $('a.ui-slider-handle:eq(0)').css('left');
                    $('p#ht0')
                    .text(ui.values[0]);
                    $('p#ht1')
                    .text(ui.values[1]);

                    var low = ui.values[0];
                    var high= ui.values[1];
                    self.slide(low, high);
                },
                create: function(event,ui) {
                    // Hack to get red bar resizing
                    var size = $('a.ui-slider-handle:eq(1)').css('left');
                    $('span.hack_red').css('left',size);
                    // Hack for handles tooltip
                    var size0 = $('a.ui-slider-handle:eq(0)').css('left');

                    $('a.ui-slider-handle:eq(0)').append('<p id="ht0" class="tooltip">40</p>');
                    $('a.ui-slider-handle:eq(1)').append('<p id="ht1" class="tooltip">60</p>');
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
        this.report = this.options.report;
       this.$("#report-date").html(this.report.get('str'));
    }

});

var ButtonGroup = Backbone.View.extend({

    initialize: function() {
        _.bindAll(this, 'show', 'hide', 'select','unselect_all');
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
    },

    unselect_all: function() {
        this.buttons.removeClass('selected');
    }
});

var PolygonToolbar = Toolbar.extend({

    el: $("#work_toolbar"),


    initialize: function() {
        _.bindAll(this, 'change_state', 'reset');
        this.buttons = new ButtonGroup({el: this.$('#selection')});
        this.polytype = new ButtonGroup({el: this.$('#polytype')});
        this.ndfi_range = new RangeSlider({el: this.$("#ndfi_slider")});
        this.compare = new ButtonGroup({el: this.$("#compare_buttons")});
        this.polytype.hide();
        this.buttons.bind('state', this.change_state);
    },

    change_state: function(st) {
        this.trigger('state', st);
    },

    reset: function() {
        this.polytype.unselect_all();
        this.buttons.unselect_all();
    }

});

var Overview = Backbone.View.extend({

    el: $("#overview"),

    finished: false,

    events: {
        'click #done': 'done',
        'click #go_back': 'go_back',
        'click .notes': 'open_notes',
        'click #report_done': 'confirm_generation',
        'click #cancel': 'cancel_report'
    },

    initialize: function() {
        _.bindAll(this, 'done', 'on_cell', 'select_mode', 'go_back', 'set_note_count', 'report_changed', 'cancel_report');
        this.report = this.options.report;
        this.analysed= this.$('#cell_analisys');
        this.$("#analysed_global_final").hide();
        this.$("#confirmation_dialog").hide();
        this.report.bind('change', this.report_changed);
        this.report_changed();
        this.el.fadeIn();
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
            this.analysed.show();
            this.$('.notes').show();
        } else {
            this.$('.notes').hide();
        }
        var text = "Global map";
        if(z > 0) {
            text = "Cell " + z + "/" + x + "/" + y + " - ";
            this.$("#go_back").show();
            this.$("#analysed_global_progress").hide();
            this.$("#analysed_global_final").hide();
        } else {
            if(!this.finished) {
                this.$("#analysed_global_progress").show();
            } else {
                this.$("#analysed_global_progress").hide();
                this.$("#analysed_global_final").show();
            }
            this.$("#go_back").hide();
        }
        this.$("#current_cell").html(text);
    },

    select_mode: function() {
        this.analysed.hide();
    },

    report_changed: function() {
        var total = this.report.get('total_cells');
        var current = this.report.get('cells_finished');
        var percent = 100*Math.floor(current/total);
        var text = current + '/' + total + " (" + percent + "%)";
        this.$("#progress_number").html(text);
        this.$(".stats_progress").html(text);
        this.$("#progress").css({width: percent + "%"});
        if(percent == 100) {
            this.finished = true;
            //time to show generate button
            this.$("#analysed_global_progress").hide();
            this.$("#analysed_global_final").show();
        }
    },

    confirm_generation: function(e) {
        e.preventDefault();
        this.$("#confirmation_dialog").slideDown('fast');
    },

    cancel_report: function(e) {
        e.preventDefault();
        this.$("#confirmation_dialog").slideUp();
    }



});
