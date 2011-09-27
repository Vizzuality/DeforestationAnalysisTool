

// small slider selector
var SliderControl = Backbone.View.extend({

    initialize: function() {
        var self = this;
        _.bindAll(self, 'pos');
        this.mix = 0;
        this.max = 100;
        self.pos(this.options.position);
        this.el.draggable({
            axis: "x",
            drag: function(event, ui) {
                self.pos(ui.position.left);
            }, 
            stop: function(event, ui) {
                self.pos(ui.position.left);
            },
            grid: [ 7, 7]
        });
    },

    pos: function(p) {
        var self = this;
        if(p !== undefined) {
            self.position = p;
            self.el.css({left: self.position});
            self.trigger('move', self.position);
        }
        return self.position;
    },

    set_constrain: function(min, max) {
        this.min = min;
        this.max = max;
        this.el.draggable( "option", "containment", [min, 0, max, 100]);
    }
});

ReportBarView = Backbone.View.extend({

    tagName: 'li',
    template: _.template($("#report-bar").html()),

    initialize: function() {
    },

    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    }
});

MONTH_SIZE = 7;
var TimeRange = Backbone.View.extend({
    el: $('#timerange'),

    initialize: function() {
        _.bindAll(this,  'update_range', 'populate');

        this.left = new SliderControl({el: this.$('#left'),
            position: -1
        });
        this.rigth = new SliderControl({el: this.$('#right'),
            position: 10*MONTH_SIZE
        });
        this.left.bind('move', this.update_range);
        this.rigth.bind('move', this.update_range);

        this.selection = this.$('.selection');

        this.bars = this.$("#bars");
        this.colored_bars = this.$("#colored_bars");
        // get data
        this.reports = this.options.reports;
        this.reports.bind('reset', this.populate);
    },

    normalize: function(reports) {
        degs = this.reports.map(function(r) {
            return r.get('degradation');
        });
        defs = this.reports.map(function(r) {
            return r.get('deforestation');
        });
        var max_def = _(defs).max();
        var max_deg = _(degs).max();
        this.reports.each(function(r) {
            r.set({
                def_percent: 50*r.get('deforestation')/max_def,
                deg_percent: 50*r.get('degradation')/max_deg
            });
        });
    },

    populate: function(reports) {
        var self = this;
        this.bars.html('');
        this.normalize(reports);
        this.reports.each(function(r) {
            var v = new ReportBarView({model: r});
            self.bars.append(v.render().el);
        });

        this.reports.each(function(r) {
            //TODO: render with color
            var v = new ReportBarView({model: r});
            self.colored_bars.append(v.render().el);
        });
        this.rigth.pos(this.pos_for_month_right(this.reports.length - 1));
        this.update_range();
    },

    pos_for_month_left: function(month) {
        return -1 + month*MONTH_SIZE;
    },
    pos_for_month_right: function(month) {
        return this.pos_for_month_left(month) + MONTH_SIZE + 3;
    },

    update_range: function(to) {
        var base = this.el.offset();
        this.rigth.set_constrain(
            base.left + this.left.pos() + MONTH_SIZE,
            Math.min(base.left + this.reports.length*MONTH_SIZE + 3, base.left + this.el.width() + 1));
        this.left.set_constrain(
            base.left - 1 ,
            base.left + this.rigth.pos() - MONTH_SIZE );

        this.selection.css({left: this.left.pos()});
        this.colored_bars.css({left: -this.left.pos() - 1});
        var s = this.rigth.pos() - this.left.pos();
        this.selection.css({width: s});
        console.log(this.get_report_range().length);
        this.trigger('range_change', this.get_report_range());
    },

    get_report_range: function() {
        var m0 = (1+this.left.pos())/MONTH_SIZE;
        var m1 = (this.rigth.pos()-2)/MONTH_SIZE;
        return this.reports.models.slice(m0, m1);
    }


});
