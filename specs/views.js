/*global define*/
define(function(require) {
    'use strict';

    var _ = require('underscore'),
        $ = require('jquery'),
        expect = require('expect'),
        afterEach = require('mocha').afterEach,
        beforeEach = require('mocha').beforeEach,
        describe = require('mocha').describe,
        it = require('mocha').it,
        Handlebars = require('handlebars'),
        Views = require('chiropractor/views');

    return function() {
        describe('Base', function() {
            var View = Views.Base.extend({
                spy: function() {},
                remove: function() {
                    this.spy();
                    Views.Base.prototype.remove.apply(this, arguments);
                }
            });

            it('should call the remove method when the ' +
               'parent element has its content replaced.', function() {
                   var view = new View(),
                       spy = this.sandbox.spy(view, 'spy');

                   this.dom.append(view.render().el);
                   expect(spy.callCount).to.equal(0);
                   this.dom.html('');
                   expect(spy.callCount).to.equal(1);
               });

            it('should call the remove method when an ' +
               'ancestor of the element has its content replaced.', function() {
                   var content = $('<div><div class="subcontent"></div></div>'),
                       view1 = new View(),
                       view2 = new View(),
                       spy1 = this.sandbox.spy(view1, 'spy'),
                       spy2 = this.sandbox.spy(view2, 'spy');

                   this.dom.append(content);
                   this.dom.find('.subcontent').append(view1.render().el);
                   view1.$el.html(view2.render().el);

                   expect(spy1.callCount).to.equal(0);
                   expect(spy2.callCount).to.equal(0);

                   this.dom.html('');

                   expect(spy1.callCount).to.equal(1);
                   expect(spy2.callCount).to.equal(1);
               });

            it('should allow a template string to be provided as the ' +
               'template attribute.', function() {
                   var View = Views.Base.extend({
                            template: 'string template'
                       }),
                       view = (new View()).render();

                   expect(view.$el.html()).to.equal('string template');
                   view.remove();
               });

            it('should allow a compiled handlebars template to be ' +
               'provided.', function() {
                   var View = Views.Base.extend({
                           template: Handlebars.compile('compiled')
                       }),
                       view = (new View()).render();

                   expect(view.$el.html()).to.equal('compiled');
                   view.remove();
               });

            it('should allow for a context function to be defined by ' +
               'subclasses', function() {
                   var View = Views.Base.extend({
                           template: '{{ one }} thing',
                           context: function() {
                               return {
                                   one: 'one'
                               };
                           }
                       }),
                       view = (new View()).render();

                   expect(view.$el.html()).to.equal('one thing');
                   view.remove();
               });

            it('should allow passing a `context` argument to extend the ' +
               'default context with.', function() {
                var View = Views.Base.extend({
                        template: 'Test {{ one }} - {{ two }}'
                    }),
                    view = new View({
                        context: {
                            one: 1,
                            two: 2
                        }
                    });

                expect(view.render().$el.html())
                    .to.equal('Test 1 - 2');
                view.remove();
            });
        });
    };
});
