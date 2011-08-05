
var NoteView = Backbone.View.extend({

    tagName: 'li',

    template: _.template($("#note-template").html()),

    initialize: function() {
        _.bindAll(this, 'render');
    },

    render: function() {
        $(this.el).html(this.template(this.model.toJSON()));
        return this;
    }
});

var NotesDialog = Backbone.View.extend({

   events: {
       'click .close': 'close',
       'click .close_notes': 'close',
       'click .add_note': 'add_note'
   },

   initialize: function() {
        _.bindAll(this, 'open', 'addAll', 'add', 'close', 'add_note');
        this.cell = this.options.cell;
        this.notes = new NoteCollection({cell: this.cell});
        this.notes.bind('reset', this.addAll);
        this.notes.bind('add', this.add);
        var ul = this.$('ul');
        this.ul = ul;
        ul.jScrollPane({autoReinitialise:true});
        this.contents = ul.data('jsp').getContentPane();
        this.count = 0;
        this.$("h3").html("There aren't any notes");
   },

    set_cell: function(cell) {
        this.cell = cell;
        this.notes.cell = cell;
    },

   close: function(e) {
        if (e !== undefined) {
            e.preventDefault();
        }
        this.el.hide();
        //this.notes.unbind('reset', this.addAll);
        //this.notes.unbind('add', this.add);
        this.trigger('close', this.notes);
   },

   addAll: function() {
        this.count = 0;
        this.contents.html('');
        this.notes.each(this.add);
        this.el.show();
        window.loading.finished();
   },

   add: function(m) {
        this.count++;
        var note = new NoteView({model: m});
        this.contents.append(note.render().el);
        this.$("h3").html(this.count + " notes");
        this.ul.data('jsp').scrollToPercentY(100);
        this.trigger('note_count', this.count);
   },

   add_note: function(e) {
        e.preventDefault();
        var text = this.$("#comment").val();
        this.$("#comment").val('');
        if(text.length > 0) {
            this.notes.create({
                'msg': text
            });
        }
   },

   open: function() {
        window.loading.loading();
        //TODO: manage error
        this.notes.fetch();
   }

});
