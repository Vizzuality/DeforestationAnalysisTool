
var UserView = Backbone.View.extend({

    tagName: 'li',

    template: _.template($("#user-template").html()),

    initialize: function() {
        _.bindAll(this, 'render');
    },

    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    }
});

var UsersDialog = Backbone.View.extend({

    el: $("#user_dialog"),
    events: {
       'click .close': 'close',
       'click .close_user': 'close',
       'click .add_note': 'add_user'
    },

    initialize: function() {
        _.bindAll(this, 'open', 'close', 'add', 'addAll','add_user');
        this.users = new UserCollection();
        this.users.bind('reset', this.addAll);
        this.users.bind('add', this.add);

        var ul = this.$('ul');
        this.ul = ul;
        ul.jScrollPane({autoReinitialise:true});
        this.contents = ul.data('jsp').getContentPane();
    },

    close: function(e) {
        if (e !== undefined) {
            e.preventDefault();
        }
        this.el.hide();
    },

    addAll: function() {
        this.contents.html('');
        this.users.each(this.add);
    },

    add: function(m) {
        var user = new UserView({model: m});
        this.contents.append(user.render().el);
    },

    open: function() {
        this.el.fadeIn('fast');
        this.users.fetch();
    },

    add_user: function(e) {
        e.preventDefault();
        var text = this.$("#user_mail").val();
        if(text.length > 0) {
            this.users.create({
                'mail': text
            });
        }
        this.$("#user_mail").val('');
    }

});

