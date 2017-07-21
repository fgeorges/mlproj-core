#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const s = require('../../../src/space');

const platform = new p.Platform();

t.test('Parsing elephant - all range index types', ass => {
    let path  = t.spaceFile('simple-elephant', 'prod');
    let space = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters', space, {});
    ass.equal('The @code param', space.param('@code'), 'simple-elephant');
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
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
    const srvs = space.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
