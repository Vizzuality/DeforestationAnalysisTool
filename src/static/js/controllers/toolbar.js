
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
        _.bind(this, 'slide', 'set_values');
        var self = this;
        this.el.slider({
                range: true,
                min: 0,
                max: 200,
                values: [40, 60], //TODO: load from model
                slide: function(event, ui) {
                    // Hack to get red bar resizing

                    var low = ui.values[0];
                    var high= ui.values[1];
                    self.slide(low, high);
                },
                stop: function(event, ui) {
                    var low = ui.values[0];
                    var high= ui.values[1];
                    self.trigger('stop', low, high);
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

    slide: function(low, high, silent) {
        var size = $('a.ui-slider-handle:eq(1)').css('left');
        $('span.hack_red').css('left',size);
        // Hack for handles tooltip
        var size0 = $('a.ui-slider-handle:eq(0)').css('left');
        $('p#ht0').text(low);
        $('p#ht1').text(high);
        if(silent !== true) {
            this.trigger('change', low, high);
        }
    },

    // set_values([0, 1.0],[0, 1.0])
    set_values: function(low, high) {
        low = Math.floor(low*200);
        high =  Math.floor(high*200);

        this.el.slider( "values" , 0, low);
        this.el.slider( "values" , 1, high);
        //launch an event
        this.slide(low, high, false);//true);
    }
});

var ReportToolbar = Toolbar.extend({

    el: $("#range_select"),

    initialize: function() {
        this.report = this.options.report;
       this.$("#report-date").html(this.report.escape('str'));
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

    events: {
        'click #compare': 'none',
        'click #range': 'none'
    },

    initialize: function() {
        _.bindAll(this, 'change_state', 'reset');
        this.buttons = new ButtonGroup({el: this.$('#selection')});
        this.polytype = new ButtonGroup({el: this.$('#polytype')});
        this.ndfi_range = new RangeSlider({el: this.$("#ndfi_slider")});
        this.compare = new ButtonGroup({el: this.$("#compare_buttons")});
        this.polytype.hide();
        this.buttons.bind('state', this.change_state);
    },

    none: function(e) { e.preventDefault(); },

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
        'click #cancel': 'cancel_report',
        'click #confirm': 'close_report',
        'click #cancel_done': 'cancel_done',
        'click #confirm_done': 'cell_done',
        'click #go_setting': 'open_settings'
    },

    initialize: function() {
        _.bindAll(this, 'done', 'on_cell', 'select_mode', 'go_back', 'set_note_count', 'report_changed', 'cancel_report', 'change_user_cells', 'close_report', 'cancel_done', 'cell_done', 'open_settings');
        this.report = this.options.report;
        this.analysed= this.$('#cell_analisys');
        this.$("#analysed_global_final").hide();
        this.$("#confirmation_dialog").hide();
        this.$("#done_confirmation_dialog").hide();
        this.$("#analysed_global_progress").hide();
        this.report.bind('change', this.report_changed);
        this.report_changed();
        this.el.fadeIn();
    },
    

    set_note_count: function(c) {
        this.$('.notes').html( c + " NOTE" + (c==1?'':'S'));
    },

    done: function(e) {
        e.preventDefault();
        this.$("#done_confirmation_dialog").fadeIn();
        //this.trigger('done');
    },

    open_notes: function(e) {
        e.preventDefault();
        this.trigger('open_notes');
    },

    open_settings: function(e) {
        e.preventDefault();
        this.trigger('open_settings');
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
            this.$("#analysed_global_final").hide();
        } else {
            if(!this.finished) {
                //this.$("#analysed_global_progress").show();
            } else {
                //this.$("#analysed_global_progress").hide();
            }
            this.$("#analysed_global_final").show();
            this.$("#go_back").hide();
        }
        this.$("#current_cell").html(text);
    },

    select_mode: function() {
        this.analysed.hide();
    },

    set_ndfi: function(n) {
        this.$('#ndfi_change_value').html("ndfi change: " + n.toFixed(2));
    },

    report_changed: function() {
        var total = this.report.escape('total_cells');
        var current = this.report.escape('cells_finished');
        var percent = 100*Math.floor(current/total);
        var text = current + '/' + total + " (" + percent + "%)";
        this.$("#progress_number").html(text);
        this.$(".stats_progress").html(text);
        this.$("#progress").css({width: percent + "%"});
        if(percent == 100) {
            this.finished = true;
            //time to show generate button
            //this.$("#analysed_global_progress").hide();
            //this.$("#analysed_global_final").show();
        }
    },

    confirm_generation: function(e) {
        e.preventDefault();
        this.$("#confirmation_dialog").fadeIn();
    },

    cancel_report: function(e) {
        e.preventDefault();
        this.$("#confirmation_dialog").fadeOut(0.2);
    },

    change_user_cells: function(user, count) {
        this.$("#cells").html(count + " cells closed");
    },

    close_report: function(e) {
        this.trigger('close_report');
        e.preventDefault();
    }, 

    cancel_done: function(e) {
        this.$("#done_confirmation_dialog").fadeOut(0.2);
        e.preventDefault();
    }, 

    cell_done: function(e) {
        this.$("#done_confirmation_dialog").fadeOut(0.2);
        this.trigger('done');
        e.preventDefault();
    }



});
