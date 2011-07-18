
var Toolbar = Backbone.View.extend({

    show: function() {
        console.log("show");
        this.el.show();
    },

    hide: function() {
        this.el.hide();
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
    }

});
