

$(function() {
    window.Note = Backbone.Model.extend({
        url: '/api/test/note'
    });

    window.NoteList= Backbone.Collection.extend({

        model: Note,
        url: '/api/test/note'

    });

    window.Notes = new NoteList();


    window.NoteView = Backbone.View.extend({

        tagName:  "li",
        template: _.template($('#item-template').html()),

        initialize: function() {
              _.bindAll(this, 'render');
              this.model.bind('change', this.render);
              this.model.bind('create', this.render);
              this.model.view = this;
        },

        render: function() {
           $(this.el).html(this.template(this.model.toJSON()));
            return this;
        }

    });


    window.AppView = Backbone.View.extend({
        el: $("#app"),
        events : {
                "keypress #msg"      : "updateEnter"
        },
        initialize: function() {
          _.bindAll(this, 'addOne', 'addAll', 'render', 'updateEnter');

          Notes.bind('add',     this.addOne);
          Notes.bind('reset',   this.addAll);
          Notes.bind('all',     this.render);

          /*Notes.reset([
                { msg: 'msg1' },
                { msg: 'msg2' }
          ]);*/
          Notes.fetch();
        },

        addOne: function(note) {
              var view = new NoteView({model: note});
              this.$("#notes").append(view.render().el);
        },

        addAll: function() {
            Notes.each(this.addOne);
        },
        updateEnter: function(e) {
            if (e.keyCode == 13) {
                var n = Notes.create({'msg': this.$("#msg").val()});
                Notes.add(n);
                this.$("#msg").val('');
            }
        }


    });

    window.App = new AppView();


});






















