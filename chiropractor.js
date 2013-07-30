
/*global define*/
define('chiropractor/views',['require','underscore','jquery','backbone','handlebars'],function(require) {
    

    var _ = require('underscore'),
        $ = require('jquery'),
        Backbone = require('backbone'),
        Handlebars = require('handlebars'),
        Base;

    if (!$.event.special.remove) {
        $.event.special.remove = {
            remove: function(e) {
                if (e.handler) e.handler();
            }
        };
    }

    Base = Backbone.View.extend({
        initialize: function(options) {
            options = options || {};
            Backbone.View.prototype.initialize.call(this, options);

            _.bindAll(this, 'remove');

            this._childViews = [];
            this._context = options.context || {};

            this.$el.on('remove', this.remove);
        },

        _addChild: function(view) {
            this._childViews.push(view);
        },

        context: function() {
            return {
                model: this.model,
                collection: this.collection
            };
        },

        render: function() {
            var template = typeof(this.template) === 'string' ?
                    Handlebars.compile(this.template) : this.template,
                context = typeof(this.context) === 'function' ?
                    this.context() : this.context;

            context.declaringView = this;
            _.defaults(context, this._context);

            if (template) {
                this.$el.html(template(context));
            }

            _(this._childViews).each(function(view) {
                this.$('#chiropractorId' + view.cid).replaceWith(view.el);
            }, this);
            return this;
        },

        remove: function() {
            this.$el.off('remove', this.remove);
            _(this._childViews).each(function(view) {
                view.remove();
            });
            this._childViews = [];
            Backbone.View.prototype.remove.apply(this, arguments);
        }
    });

    return {
        Base: Base
    };
});

/*global define,setTimeout,clearTimeout*/
define('chiropractor/models/auth',['require','backbone','jquery','underscore','jquery.cookie'],function(require) {
    

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

/*global define,setTimeout,clearTimeout*/
define('chiropractor/models',['require','backbone','underscore','./models/auth'],function(require) {
    

    var Backbone = require('backbone'),
        _ = require('underscore'),
        auth = require('./models/auth'),
        Base;

    Base = Backbone.Model.extend({
        sync: function(method, model, options) {
            // Setup the authentication handlers for the BaseModel
            auth.sync.call(this, method, model, options);

            return Backbone.Model.prototype.sync.call(
                this, method, model, options
            );
        },

        parse: function(resp, options) {
            // We need to unwrap the old WiserTogether API envelop format.
            if (resp.data && resp.meta) {
                if (parseInt(resp.meta.status, 10) >= 400) {
                    options.legacyError = true;
                    if (resp.meta.errors && resp.meta.errors.form) {
                        this.validationError = resp.meta.errors.form;
                        this.trigger(
                            'invalid',
                            this,
                            this.validationError,
                            _.extend(options || {}, {
                                validationError: this.validationError
                            })
                        );
                    }
                    else {
                        this.trigger('error', this, resp.data, options);

                        if (options.error) {
                            options.error(this, resp.data, options);
                        }
                    }
                    // We do not want an error response to update the model
                    // attributes (returning an empty object leaves the model
                    // state as it was
                    return {};
                }
                return resp.data;
            }
            return Backbone.Model.prototype.parse.apply(this, arguments);
        },

        set: function(attrs, options) {
            // We need to allow the legacy errors to short circuit the Backbone
            // success handler in the case of a legacy server error.
            if (options && options.legacyError) {
                delete options.legacyError;
                return false;
            }

            return Backbone.Model.prototype.set.apply(this, arguments);
        }
    });

    return {
        Base: Base,
        cleanup: auth.cleanup
    };
});

/*global define*/
define('chiropractor/collections',['require','backbone'],function(require) {
    

    var Backbone = require('backbone'),
        Base;

    Base = Backbone.Collection.extend({
    });

    return {
        Base: Base
    };
});

/*global define*/
define('chiropractor/routers',['require','backbone'],function(require) {
    

    var Backbone = require('backbone'),
        Base;

    Base = Backbone.Router.extend({
    });

    return {
        Base: Base
    };
});

/*global define*/
define('chiropractor/hbs/view',['require','underscore','backbone','handlebars'],function(require) {
    

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

/*global define*/
define('chiropractor/hbs',['require','./hbs/view'],function(require) {
    

    require('./hbs/view');
});

/*global define*/
define('chiropractor/main',['require','backbone','backbone.subroute','./views','./models','./collections','./routers','./hbs'],function(require) {
    

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

define('chiropractor', ['chiropractor/main'], function (main) { return main; });
