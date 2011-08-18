

var User = Backbone.Model.extend({

    url: function() {
        return '/api/v0/user';
    },

    inc_cells: function() {
        this.set({current_cells: this.get('current_cells') + 1});
        this.save();
    }

});

var UserCollection = Backbone.Collection.extend({
    model: User,
    url : '/api/v0/user'
});
