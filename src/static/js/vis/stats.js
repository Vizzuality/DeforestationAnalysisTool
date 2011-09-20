
// contains stats for a region
// each region is defined by a table_id and
// a name which is an string
var RegionStat = Backbone.Model.extend({
});


var RegionStatCollection = Backbone.Collection.extend({
    model: RegionStat
});
