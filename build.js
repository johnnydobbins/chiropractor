require.config({
    packages: [
        {name: "chiropractor", location: 'src'}
    ],

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
        'backbone':           'bower_components/backbone/backbone',
        'jquery':             'bower_components/jquery/jquery',
        'jquery.cookie':      'bower_components/jquery.cookie/jquery.cookie',
        'backbone.subroute':  'bower_components/backbone.subroute/backbone.subroute'
    },

    pragmasOnSave: {
        excludeHbsParser : true,
        excludeHbs: true,
        excludeAfterBuild: true
    },

    shim: {
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
        json3: {
            exports: 'JSON'
        }
    },
    enforceDefine: true
});

