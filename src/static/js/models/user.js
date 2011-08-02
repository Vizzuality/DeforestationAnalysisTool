

var User = Backbone.Model.extend({

    url: function() {
        return '/api/v0/user/' + this.get('id');
    },

    inc_cells: function() {
        this.set({current_cells: this.get('current_cells') + 1});
        this.save();
    }


});
