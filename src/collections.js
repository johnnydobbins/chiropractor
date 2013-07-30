/*global define*/
define(function(require) {
    'use strict';

    var Backbone = require('backbone'),
        Base;

    Base = Backbone.Collection.extend({
    });

    return {
        Base: Base
    };
});
