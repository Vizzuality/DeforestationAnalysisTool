
var Note = Backbone.Model.extend({

});


var NoteCollection  = Backbone.Collection.extend({
    model: Note,

    initialize: function(options) {
        this.cell = options.cell;
    },

    url: function() {
        return "/api/v0/report/" + this.cell.get('report_id') + "/cell/" + this.get('z') + "_" + this.get('x') + "_" + this.get('y') + "/note";
    }
});
