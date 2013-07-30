Chiropractor
============

Straighten out your Backbone.js

Building
--------

In order to build the Chiropractor code you must run:

	grunt

Which will generate `chiropractor.js` as well as `chiropractor.min.js` in the root of the project. Whenever you wish to run this command, please be sure to increment the version defined in `package.json` as well as `bower.json`.

Tests
-----

There are two ways to run tests:

	npm test

Or if you want more control over how your tests are run (such as continuous
testing with auto-running tests on file changes you can run:

	./node_modules/.bin/karma start --dev --browsers Chrome,PhantonJS
