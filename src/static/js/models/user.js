//http://ntt.cc/2008/05/10/over-10-useful-javascript-regular-expression-functions-to-improve-your-web-applications-efficiency.html
function validateEmail(email) {
   var isEmail_re       = /^\s*[\w\-\+_]+(\.[\w\-\+_]+)*\@[\w\-\+_]+\.[\w\-\+_]+(\.[\w\-\+_]+)*\s*$/;
   return String(email).search (isEmail_re) != -1;
}


var User = Backbone.Model.extend({

    urlRoot: function() {
        return '/api/v0/user';
    },

    inc_cells: function() {
        this.set({current_cells: this.get('current_cells') + 1});
        this.save();
    },
    validate: function(attrs) {
        if (!validateEmail(attrs.mail)) {
          return "email is not valid";
        }
    }


});

var UserCollection = Backbone.Collection.extend({
    model: User,
    url : '/api/v0/user'
});
