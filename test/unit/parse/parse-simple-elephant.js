#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing elephant - all range index types', ass => {
    let path = t.spaceFile(ctxt, 'simple-elephant', 'prod');
    let env  = new e.Environ(ctxt, path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, {});
    ass.equal('The @code param', env.param('@code'), 'simple-elephant');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 1 database', dbs.length, 1);
    ass.database('The content db', dbs[0], null, 'simple-elephant-content',
                 ['simple-elephant-content-001'], null, null, null, {
                     "range-element-index": [{
                         "scalar-type":           'dateTime',
                         "localname":             'elem',
                         "namespace-uri":         '',
                         "range-value-positions": false,
                         "invalid-values":        'ignore',
                         "collation":             ''
                     }],
                     "range-element-attribute-index": [{
                         "scalar-type":           'string',
                         "localname":             'attr',
                         "namespace-uri":         '',
                         "range-value-positions": false,
                         "invalid-values":        'ignore',
                         "collation":             'http://marklogic.com/collation/',
                         "parent-localname":      'elem',
                         "parent-namespace-uri":  ''
                     }, {
                         "scalar-type":           'dateTime',
                         "localname":             'date',
                         "namespace-uri":         '',
                         "range-value-positions": false,
                         "invalid-values":        'ignore',
                         "collation":             '',
                         "parent-localname":      'elem',
                         "parent-namespace-uri":  'http://example.org/'
                     }, {
                         "scalar-type":           'dateTime',
                         "localname":             'time',
                         "namespace-uri":         '',
                         "range-value-positions": false,
                         "invalid-values":        'ignore',
                         "collation":             '',
                         "parent-localname":      'elem',
                         "parent-namespace-uri":  'http://example.org/'
                     }, {
                         "scalar-type":           'string',
                         "localname":             'bear',
                         "namespace-uri":         '',
                         "range-value-positions": false,
                         "invalid-values":        'ignore',
                         "collation":             'http://marklogic.com/collation/',
                         "parent-localname":      'elem',
                         "parent-namespace-uri":  'http://example.org/'
                     }, {
                         "scalar-type":           'string',
                         "localname":             'cat',
                         "namespace-uri":         '',
                         "range-value-positions": false,
                         "invalid-values":        'ignore',
                         "collation":             'http://marklogic.com/collation/',
                         "parent-localname":      'elem',
                         "parent-namespace-uri":  'http://example.org/'
                     }],
                     "range-path-index": [{
                         "scalar-type":           'int',
                         "path-expression":       'foo/bar',
                         "range-value-positions": false,
                         "invalid-values":        'ignore',
                         "collation":             ''
                     }]
                 });
    // the app server
    const srvs = env.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
