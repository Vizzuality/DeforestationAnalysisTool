

// small slider selector
var SliderControl = Backbone.View.extend({

    initialize: function() {
        var self = this;
        _.bindAll(self, 'pos');
        self.pos(this.options.position);
        this.el.draggable({
            axis: "x",
            drag: function(event, ui) {
                self.pos(ui.position.left);
            },
            grid: [ 6, 6 ]
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
MONTH_SIZE = 6;
var TimeRange = Backbone.View.extend({
    el: $('#timerange'),

    initialize: function() {
        _.bindAll(this,  'update_range', 'populate');

        this.left = new SliderControl({el: this.$('#left'),
            position: 0
        });
        this.rigth = new SliderControl({el: this.$('#right'),
            position: 10*MONTH_SIZE
        });
        this.left.bind('move', this.update_range);
        this.rigth.bind('move', this.update_range);

        this.selection = this.$('.selection');
        this.update_range();

        this.bars = this.$("#bars");
        // get data
        this.reports = new ReportCollection();
        this.reports.bind('reset', this.populate);
        this.reports.fetch();
    },

    populate: function(reports) {
        var self = this;
        this.bars.html('');
        this.reports.each(function(r) {
            var v = new ReportBarView({model: r});
            self.bars.append(v.render().el);
        });
        this.rigth.pos(MONTH_SIZE*this.reports.length);
    },

    update_range: function(to) {
        /*this.rigth.set_constrain(this.left.pos() + MONTH_SIZE,
            this.el.width());
        this.left.set_constrain(0,
            this.rigth.pos() - MONTH_SIZE);
        */
        this.selection.css({left: this.left.pos()});
        var s = this.rigth.pos() - this.left.pos();
        this.selection.css({width: s});
        this.trigger('range_change', this.get_month_range());
    },

    get_month_range: function() {
        return [this.left.pos()/MONTH_SIZE, this.rigth.pos()/MONTH_SIZE];
    }


});
