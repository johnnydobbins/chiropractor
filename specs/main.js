/*global define*/
define(function(require) {
    'use strict';

    var describe = require('mocha').describe;

    return function() {
        describe('models', function() {
            require('specs/models')();
        });

        describe('views', function() {
            require('specs/views')();
        });

        describe('hbs', function() {
            describe('view', function() {
                require('specs/hbs/view')();
            });
        });
    };
});
