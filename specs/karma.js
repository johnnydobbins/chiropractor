require.config({
    packages: [
        {name: "chiropractor", location: "src"}
    ],

    baseUrl: '/base',

    hbs: {
        disableI18n: true,
        disableHelpers: true
    },

    paths: {
        'hbs':                'bower_components/require-handlebars-plugin/hbs',
        'handlebars':         'bower_components/require-handlebars-plugin/Handlebars',
        'i18nprecompile' :    'bower_components/require-handlebars-plugin/hbs/i18nprecompile',
        'json':               'bower_components/require-handlebars-plugin/hbs/json',
        'json3':              'bower_components/json3/lib/json3',
        'underscore':         'bower_components/underscore/underscore',
        'chai':               'bower_components/chai/chai',
        'expectjs':           'bower_components/expect/expect',
        'backbone':           'bower_components/backbone/backbone',
        'jquery':             'bower_components/jquery/jquery',
        'es5-shim':           'bower_components/es5-shim/es5-shim',
        'jquery.cookie':      'bower_components/jquery.cookie/jquery.cookie',
        'sinon':              'bower_components/sinonjs/sinon',
        'backbone.subroute':  'bower_components/backbone.subroute/backbone.subroute',
        'expect':             'lib/expect',
        'mocha':              'lib/mocha',
        'browser':            'lib/browser'
    },

    pragmasOnSave: {
        excludeHbsParser : true,
        excludeHbs: true,
        excludeAfterBuild: true
    },

    // Shims are used to set dependencies for third-party modules which
    // do not require their dependencies. first-party modules and forks
    // should not require entries in shims, as they should be able to
    // use define() or require() as appropriate to ensure all their
    // dependencies are available
    shim: {
        'sinon': {
            exports: 'sinon',
        },
        'backbone': {
            deps: ['jquery', 'underscore'],
            exports: 'Backbone'
        },
        'underscore': {
            exports: '_'
        },
        'jquery.cookie': {
            deps: ['jquery'],
            exports: 'jQuery.cookie'
        },
        'console-shim': {
            exports: 'console'
        },
        json3: {
            exports: 'JSON'
        },
        expectjs: {
            exports: 'expect'
        },
        chai: {
            deps: ['es5-shim']
        }
    },
    deps: [
    ],
    enforceDefine: true,
    waitSeconds: 30
});

require([
    'require',
    'specs/setup/mocha',
    'specs/main'
], function(require, mochaSetup, testSuite) {
    mochaSetup();
    testSuite();
    window.__karma__.start();
});
