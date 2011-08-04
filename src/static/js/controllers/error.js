
var ErrorDialog = Backbone.View.extend({
    el: $("error_dialog"),

    events: {
        'click #ok': 'close'
    },

    initialize: function() {
        _.bindAll(this, 'close', 'show');
        this.msg = this.options.msg;
        this.$("#error_text").html(this.msg);
    },

    show: function() {
        this.el.fadeIn('fast');
    },

    close: function(e) {
        e.preventDefault();
        this.el.hide();
    }

});

function show_error(msg) {
    var dlg = new ErrorDialog({msg: msg});
    dlg.show();
}
