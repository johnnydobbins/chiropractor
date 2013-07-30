/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        Backbone = require('backbone'),
        Handlebars = require('handlebars');

    Handlebars.registerHelper('view', function() {
        // template helper in the form of:
        //
        //      {{ view "path/to/require/module[|ViewName]" [context] }}
        var View, view, options, requirePath, viewName, attrs, requireBits;

        options = arguments[arguments.length - 1];
        attrs = arguments[1] || {};

        if (typeof(arguments[0]) === 'string') {
            requireBits = arguments[0].split('|');
            requirePath = requireBits[0];
            viewName = requireBits[1];

            View = require(requirePath);
            if (typeof(viewName) === 'string') {
                View = View[viewName];
            }
        }
        else {
            View = arguments[0];
        }
        view = new View(attrs).render();

        this.declaringView._addChild(view);

        // Return a placeholder that the Chiropractor.View can replace with
        // the child view appended above.
        return new Handlebars.SafeString(
            '<' + view.el.tagName + ' id="chiropractorId' + view.cid + '">' +
            '</div>'
        );
    });
});
