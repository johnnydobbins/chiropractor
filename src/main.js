/*global define*/
define(function(require) {
    'use strict';

    var Backbone = require('backbone'),
        SubRoute = require('backbone.subroute'),
        View = require('./views').Base,
        Model = require('./models').Base,
        Collection = require('./collections').Base,
        Router = require('./routers').Base;

    require('./hbs');

    return {
        Collection: Collection,
        Events: Backbone.Events,
        history: Backbone.history,
        Model: Model,
        Router: Router,
        SubRoute: SubRoute,
        View: View
    };
});
