/*global define,setTimeout*/
define(function(require) {
    'use strict';

    var $ = require('jquery'),
        _ = require('underscore'),
        JSON = require('json3'),
        expect = require('expect'),
        afterEach = require('mocha').afterEach,
        beforeEach = require('mocha').beforeEach,
        describe = require('mocha').describe,
        it = require('mocha').it,
        sinon = require('sinon'),
        Chiropractor = require('chiropractor'),
        Models = require('chiropractor/models');

    require('jquery.cookie');

    return function() {
        describe('unauthenticated', function() {
            beforeEach(function() {
                this.time = (new Date()).getTime();
                this.path = '/';
                this.token = 'Token a::' + this.time + '::' +
                    (this.time + 900) + '::hmac';
                $.cookie('wttoken', this.token);

                this.model = new Models.Base();
                this.model.url = this.path;
            });

            afterEach(function() {
                this.model.stopListening();
                Models.cleanup();
            });

            describe('Base', function() {
                it('should submit an authentication token on every request ' +
                   'when the cookie is set.', function() {
                       this.server.respondWith(
                            this.path,
                            [200, {'Authorization': this.token}, '{"test": 1}']
                       );

                       this.model.fetch();
                       this.server.respond();

                       expect(this.server.requests.length).to.equal(1);

                       var authHeader = this.server.requests[0]
                            .requestHeaders.Authorization;

                       expect(authHeader).to.equal(this.token);
                    });

                it('should submit an authentication token on every ' +
                   'request if the cookie is not set but a token was ' +
                   'received from the server.', function() {
                       $.removeCookie('wttoken');

                       this.server.respondWith(
                            this.path,
                            [200, {'Authorization': this.token}, '{"test": 1}']
                       );

                       this.model.fetch();
                       this.server.respond();

                       $.removeCookie('wttoken');

                       this.server.respondWith(
                            this.path,
                           '{"test": 1}'
                       );

                       this.model.fetch();
                       this.server.respond();

                       expect(this.server.requests.length).to.equal(2);

                       var authHeader = this.server.requests[1]
                            .requestHeaders.Authorization;

                       expect(authHeader).to.be.equal(this.token);
                    });

                it('should not submit an authentication token on every ' +
                   'request when the cookie is not set.', function() {
                       $.removeCookie('wttoken');

                       this.server.respondWith(
                            this.path,
                            [200, {'Authorization': this.token}, '{"test": 1}']
                       );


                       this.model.fetch();
                       this.server.respond();

                       expect(this.server.requests.length).to.equal(1);

                       var authHeader = this.server.requests[0]
                            .requestHeaders.Authorization;

                       expect(authHeader).to.be.a('undefined');
                    });

                it('should not submit an authentication token request when ' +
                   'the model toggled disableAuthToken.', function() {
                       this.model.disableAuthToken = true;

                       this.server.respondWith(
                            this.path,
                            [200, {'Authorization': this.token}, '{"test": 1}']
                       );

                       this.model.fetch();
                       this.server.respond();

                       expect(this.server.requests.length).to.equal(1);

                       var authHeader = this.server.requests[0]
                            .requestHeaders.Authorization;

                       expect(authHeader).to.be.a('undefined');
                    });

                it('should trigger a global unauthenticated event when it ' +
                   'receives a 401 response from the server.', function() {
                       var callback = sinon.spy();

                       this.model.listenToOnce(
                            Chiropractor.Events,
                            'authentication:failure',
                            callback
                        );

                       this.server.respondWith(
                            this.path,
                            [
                                401,
                                {'Content-Type': 'application/json'},
                                'Not Authorized'
                            ]
                       );

                       this.model.fetch();
                       this.server.respond();

                       expect(this.server.requests.length).to.equal(1);

                       expect(callback.calledOnce).to.equal(true);
                   });

                it('should retry any requests that fail due to being ' +
                    'unauthenticated when the global authenticated event is ' +
                    'triggered', function() {
                       var callCount = 0;
                       this.server.respondWith(
                            this.path,
                            function(xhr) {
                                var status = callCount === 0 ? 401 : 200;
                                callCount += 1;
                                xhr.respond(
                                    status,
                                    {'Content-Type': 'application/json'},
                                    '{"test": 3}'
                                );
                            }
                        );

                       this.model.fetch();
                       this.server.respond();

                       expect(this.server.requests.length).to.equal(1);

                       Chiropractor.Events.trigger('authentication:success');

                       this.server.respond();
                       expect(this.server.requests.length).to.equal(2);
                   });
            });
        });

        describe('authenticated', function() {
            beforeEach(function() {
                $.removeCookie('wttoken');
                this.path = '/';
                this.token = 'Token abc';
                this.server.respondWith(
                    this.path,
                    [
                        200,
                        {
                            'Content-Type': 'application/json',
                            'Authorization': this.token
                        },
                        '{"test": 4}'
                    ]
                );

                this.model = new Models.Base();
                this.model.url = this.path;
            });

            afterEach(function() {
                this.model.stopListening();
            });

            it('should update the wttoken cookie to store the Authorization ' +
               'token returned by the server.', function() {
                expect($.cookie('wttoken')).to.equal(null);

                this.model.fetch();
                this.server.respond();

                expect(this.server.requests.length).to.equal(1);

                expect($.cookie('wttoken')).to.equal(this.token);
            });
        });

        describe('legacy response parsing', function() {
            beforeEach(function() {
                this.path = '/';
                this.model = new Models.Base();
                this.model.url = this.path;
            });

            afterEach(function() {
                this.model.stopListening();
            });

            it('should handle non-legacy responses as normal.', function() {
                var modelData = {
                    name: 'test'
                };

                this.server.respondWith(
                    this.path,
                    [
                        200,
                        {'Content-Type': 'application/json'},
                        JSON.stringify(modelData)
                    ]
                );

                this.model.fetch();
                this.server.respond();

                expect(this.model.attributes).to.eql(modelData);
            });

            it('should extract the data from legacy responses.', function() {
                var modelData = {
                        name: 'test'
                    },
                    syncSpy = this.sandbox.spy(),
                    errorSpy = this.sandbox.spy();

                this.server.respondWith(
                    this.path,
                    [
                        200,
                        {'Content-Type': 'application/json'},
                        JSON.stringify({
                            data: modelData,
                            meta: {
                                status: 200
                            }
                        })
                    ]
                );

                this.model.listenTo(this.model, 'sync', syncSpy);
                this.model.fetch({error: errorSpy});
                this.server.respond();

                expect(errorSpy.callCount).to.equal(0);
                expect(syncSpy.callCount).to.equal(1);
                expect(this.model.attributes).to.eql(modelData);
            });

            it('should ensure that legacy errors (which come back as 200 ' +
               'responses with an meta.status code !== 200 are converted to ' +
               'Backbone errors and the underlying errors are extracted ' +
               'and the model data stays untouched.', function() {
                var modelData = {
                        name: 'tests'
                    },
                    initialData = {
                        initialData: 'foo'
                    },
                    syncSpy = this.sandbox.spy(),
                    errorSpy = this.sandbox.spy();

                this.server.respondWith(
                    this.path,
                    [
                        200,
                        {'Content-Type': 'application/json'},
                        JSON.stringify({
                            data: modelData,
                            meta: {
                                status: 400
                            }
                        })
                    ]
                );

                this.model.set(initialData);

                this.model.listenTo(this.model, 'sync', syncSpy);
                this.model.fetch({error: errorSpy});
                this.server.respond();

                expect(errorSpy.callCount).to.equal(1);
                expect(syncSpy.callCount).to.equal(0);

                // The third argument is the options object which we cannot
                // know at this time.
                expect(errorSpy.lastCall.args.splice(0, 2))
                    .to.eql([this.model, this.model]);

                // Ensure that even through we got back data from the server
                // that since this is a 400 response we do not wish to update
                // the model with that data.
                expect(this.model.attributes).to.eql(initialData);
            });

            it('should trigger invalid event when the server sends back form ' +
               'errors.', function() {
                var errors = {
                        form: {
                            '__all__': ['Error']
                        }
                    },
                    invalidSpy = this.sandbox.spy(),
                    syncSpy = this.sandbox.spy(),
                    errorSpy = this.sandbox.spy();

                this.server.respondWith(
                    this.path,
                    [
                        200,
                        {'Content-Type': 'application/json'},
                        JSON.stringify({
                            data: {},
                            meta: {
                                status: 400,
                                errors: errors
                            }
                        })
                    ]
                );

                this.model.listenTo(this.model, 'invalid', invalidSpy);
                this.model.listenTo(this.model, 'sync', syncSpy);
                this.model.listenTo(this.model, 'error', errorSpy);

                this.model.fetch();
                this.server.respond();

                expect(invalidSpy.callCount).to.equal(1);
                expect(syncSpy.callCount).to.equal(0);
                expect(errorSpy.callCount).to.equal(0);

                // The third argument is the options object which we cannot
                // know at this time.
                expect(invalidSpy.lastCall.args.splice(0, 2))
                    .to.eql([this.model, errors.form]);
            });

            it('should trigger an authentication expiration warning when the ' +
               'authentication token is going to expire in less than 2 ' +
               'minutes.', function(done) {
                var spy = this.sandbox.spy();

                this.token = 'Token a::' + this.time + '::' +
                    (this.time + 120 - 1) + '::hmac';

                $.cookie('wttoken', this.token);

                this.model.listenTo(
                    Chiropractor.Events,
                    'authentication:expiration',
                    spy
                );

                setTimeout(function() {
                    try {
                        expect(spy.callCount).to.equal(1);
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                }, 30);

                this.server.respondWith(
                    this.path,
                    [200, {'Authorization': this.token}, '{"test": 1}']
                );

                this.model.fetch();
                this.server.respond();
            });

            it('should not trigger an authentication expiration warning when ' +
               'the authentication token is greater than 2 minutes from ' +
               'expiring.', function(done) {
                var spy = this.sandbox.spy();

                this.token = 'Token a::' + this.time + '::' +
                    (this.time + 120 + 1) + '::hmac';

                $.cookie('wttoken', this.token);

                this.model.listenTo(
                    Chiropractor.Events,
                    'authentication:expiration',
                    spy
                );

                setTimeout(function() {
                    try {
                        expect(spy.callCount).to.equal(0);
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                }, 30);

                this.server.respondWith(
                    this.path,
                    [200, {'Authorization': this.token}, '{"test": 1}']
                );

                this.model.fetch();
                this.server.respond();
            });

            it('should trigger an authentication expiration resolution when ' +
               'the authentication token is renewed after the expiration ' +
               'warning event was triggered.', function(done) {
                var warningSpy = this.sandbox.spy(),
                    resolveSpy = this.sandbox.spy(),
                    token = 'Token a::' + this.time + '::' +
                        (this.time + 120 - 1) + '::hmac';

                $.cookie('wttoken', token);

                this.model.listenTo(
                    Chiropractor.Events,
                    'authentication:expiration',
                    warningSpy
                );

                this.model.listenTo(
                    Chiropractor.Events,
                    'authentication:renewal',
                    resolveSpy
                );

                setTimeout(_(function() {
                    try {
                        expect(warningSpy.callCount).to.equal(1);

                        this.model.url = '/resolved/';
                        this.server.respondWith(
                            '/resolved/',
                            [200, {'Authorization': this.token}, '{"test": 1}']
                        );

                        this.model.fetch();
                        this.server.respond();

                        expect(resolveSpy.callCount).to.equal(1);
                        done();
                    }
                    catch (e) {
                        done(e);
                    }
                }).bind(this), 30);

                this.server.respondWith(
                    this.path,
                    [200, {'Authorization': token}, '{"test": 1}']
                );

                this.model.fetch();
                this.server.respond();
            });
        });
    };
});
