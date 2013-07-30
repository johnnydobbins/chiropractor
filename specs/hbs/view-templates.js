/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        Chiropractor = require('chiropractor'),
        view;

    view = Chiropractor.View.extend({
        render: function() {
            this.$el.html('one');
            return this;
        }
    });

    view.View = Chiropractor.View.extend({
        render: function() {
            this.$el.html('two');
            return this;
        }
    });

    view.Context = Chiropractor.View.extend({
        initialize: function(options) {
            this.context = options;
        },
        template: '{{ three }}'
    });

    view.Leak = Chiropractor.View.extend({
        initialize: function(options) {
            this.context = options;
        },
        template: '{{ one }} - {{ two }} - {{ three }}'
    });

    return view;
});
