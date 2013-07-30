/*global define,setTimeout,clearTimeout*/
define(function(require) {
    'use strict';

    var Backbone = require('backbone'),
        $ = require('jquery'),
        _ = require('underscore'),
        tokenCookie = 'wttoken',
        expirationWarningMinutes = 2,
        expirationWarningActive = false,
        expirationTimeoutId, expirationWarning,
        activeToken, getToken, setToken, clearToken;

    require('jquery.cookie');

    expirationWarning = function() {
        Backbone.Events.trigger('authentication:expiration');
        expirationWarningActive = true;

        expirationTimeoutId = setTimeout(
            function() {
                Backbone.Events.trigger('authentication:failure');
            },
            expirationWarningMinutes * 60 * 1000
        );
    };

    getToken = function() {
        if (typeof(activeToken) === 'undefined') {
            activeToken = $.cookie(tokenCookie);
        }
        return activeToken;
    };

    setToken = function(token) {
        var tokenComponents = token.split('::'),
            serverTime = tokenComponents[1],
            expireTime = tokenComponents[2],
            // We want an expiration alert to happen two minutes before the
            // token is going to expire.
            expirationTimeout = Math.max(
                0,
                expireTime - serverTime - (expirationWarningMinutes * 60)
            ) * 1000;

        activeToken = token;
        $.cookie(tokenCookie, token);

        if (expirationTimeoutId) {
            clearTimeout(expirationTimeoutId);
        }

        if (expirationWarningActive) {
            Backbone.Events.trigger('authentication:renewal');
            expirationWarningActive = false;
        }

        expirationTimeoutId = setTimeout(expirationWarning, expirationTimeout);
    };

    clearToken = function() {
        activeToken = undefined;
        $.removeCookie(tokenCookie);

        if (expirationTimeoutId) {
            clearTimeout(expirationTimeoutId);
        }
    };

    Backbone.Events.on(
        'authentication:logout authentication:failure',
        clearToken
    );

    return {
        sync: function(method, model, options) {
            var beforeSend = options.beforeSend,
                onError = options.error,
                onSuccess = options.success,
                self = this,
                opts = _(options).clone();

            options.success = function(model, data, xhr) {
                var token = xhr.getResponseHeader('Authorization');
                if (token) {
                    setToken(token);
                }
                return onSuccess.apply(self, arguments);
            };

            // This is a jQuery error handler.
            options.error = function(xhr, statusText, error) {
                if (xhr.status === 400) {
                    // TODO: add logic to only trigger unauthenticated if the
                    // bad request is due to malformed token
                    Backbone.Events.trigger('authentication:failure', self, xhr);
                }
                if (xhr.status === 401) {
                    Backbone.Events.trigger('authentication:failure', self, xhr);

                    self.listenToOnce(
                        Backbone.Events,
                        'authentication:success',
                        function() {
                            self.sync(method, model, opts);
                        }
                    );
                }

                // Call the original onError handler.
                if (onError) {
                    return onError.apply(self, arguments);
                }
            };

            options.beforeSend = function(xhr) {
                var token = getToken();
                if (!self.disableAuthToken && token) {
                    xhr.setRequestHeader(
                        'Authorization',
                        token
                    );
                }

                if (beforeSend) {
                    return beforeSend.apply(this, arguments);
                }
            };
        },
        cleanup: clearToken
    };
});
