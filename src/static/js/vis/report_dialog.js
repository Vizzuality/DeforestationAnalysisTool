
/*
 ===========================================
 manages report dialog
 ===========================================
*/

var ReportDialog = Backbone.View.extend({

    format_template: _.template('<li type="<%= type %>"><%= desc %><span>[<%= type %>]</span></li>'),

    region_template: _.template('<li> <a href="#"><%= description %></a> </li>'),

    AVAILABLE_TYPES : {
        'csv': 'Datasheet report',
        'png': 'Map report',
        'pdf': 'Combined report',
        'kml': 'Google Earth'
    },

    el: $('#report_dialog_outer'),

    events: {
        'click #download': 'dowload_report',
        'click #region_selector li': 'select_region_click',
        'click #export_types li': 'select_format_click',
        'click .close': 'hide'
    },

    initialize: function() {
        _.bindAll(this, 'dowload_report', 'select_format', 'set_reports', 'select_format_click', 'select_region_click', 'keyPress');
        this.selected = this.$('#selected');
        this.region_selector = this.$('#region_selector');
        this.date_from = this.$('#date_from');
        this.date_to = this.$('#date_to');
        this.export_types = this.$('#export_types');

        //input
        this.reports = this.options.reports;
        this.formats = ['csv'];//, 'kml'];

        $(document).bind('keydown', this.keyPress);

    },

    render: function() {
        var self = this;
        // hide region selector
        if(this.custom !== undefined) {
            this.$("#custom").html(this.custom.name).show();
            this.$('#select').hide();
        } else {
            this.$("#custom").hide();
            this.$('#select').show();
        }

        // export types
        this.export_types.html('');
        _(this.formats).each(function(f) {
            self.export_types.append(self.format_template({
                'desc': self.AVAILABLE_TYPES[f],
                'type': f
            }));
        });

        this.render_regions();
        self.select_region(self.regions[0].description);
    },

    render_regions: function() {
        var self = this;
        // render regions
        self.region_selector.html('');
        _(self.regions).each(function(r) {
            self.region_selector.append(
                self.region_template(r)
            );
        });
    },

    select_region_click: function(e) {
        e.preventDefault();
        this.select_region($(e.target).html());
    },

    select_format_click: function(e) {
        e.preventDefault();
        this.export_types.find('li').removeClass('selected');
        this.select_format(e.target);
    },

    select_format: function(elem) {
        var e = $(elem);
        e.addClass('selected');
        this.selected_format = e.attr('type');
    },
    
    select_region: function(name) {
        this.region_selected = _.detect(this.regions, function(r) {
            return r.description == name;
        });
        //hack
        this.regions = _(this.regions).sortBy(function(r){
            if(r.description == name) {
                return 0;
            }
            return 1;
        });
        this.$("#selected").html(this.region_selected.description);
        this.render_regions();
    },

    dowload_report: function(e) {
        e.preventDefault();
        var reports = _(this.reports).map(function(r) {
            return r.get('fusion_tables_id');
        });
        
        var url = '/api/v0/stats/';
        if(this.custom) {
            if(this.custom.polygon) {
                url += 'polygon/csv';
            } else {
                url += this.custom.table + '/' + this.custom.zone;
            }
        } else {
            url += this.region_selected.table;
        } 
        url += '?reports=' + reports.join(',');
        if(this.custom && this.custom.polygon) {
            url += '&polygon=' + encodeURI(JSON.stringify(this.custom.polygon));
        }
        //alert(url);
        console.log(url);
        window.open(url);
    },

    set_reports: function(reports) {
        var self = this;
        this.reports = reports;
        this.date_from.html(format_date(new Date(this.reports[0].get('start'))));
        this.date_to.html(format_date(new Date(_(this.reports).last().get('end'))));
    },

    show: function(custom) {
        this.custom = custom;
        this.el.show();
        this.render();
        this.select_format(this.export_types.find(':first'));
    },

    hide: function(e) {
        if(e) e.preventDefault();
        this.el.hide();
    },
    
    keyPress: function(e) {
        //if(e) e.preventDefault();
        if (e.keyCode == 27) { //lovely
            this.hide();
        }
    }

});
