

// read only data
var Report = Backbone.Model.extend({

});

var ReportCollection = Backbone.Collection.extend({

    model: Report,

    url: '/api/v0/report'

});
