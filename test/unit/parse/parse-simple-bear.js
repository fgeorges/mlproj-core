#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const s = require('../../../src/space');

const platform = new p.Platform();

t.test('Simple bear parsing', ass => {
    let path  = t.spaceFile('simple-bear', 'prod');
    let space = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters',  space, {});
    ass.equal('The @code param',  space.param('@code'),     'simple-bear');
    ass.equal('The @title param', space.param('@title'),
              'Example with 2 names in the same range index');
    ass.equal('The @host param',  space.param('@host'),     'ml911');
    ass.equal('The @user param',  space.param('@user'),     'admin');
    ass.equal('The @pwd param',   space.param('@password'), 'admin');
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
    ass.equal('There must be 1 database', dbs.length, 1);
    ass.database('The one db', dbs[0], null, 'simple-bear', ['simple-bear-001'], null, null, null, {
        "range-element-index": [{
            "scalar-type":           'string',
            "localname":             'ape',
            "range-value-positions": false,
            "invalid-values":        'ignore',
            "collation":             'http://marklogic.com/collation/',
            "namespace-uri":         ''
        }, {
            "scalar-type":           'string',
            "localname":             'bear',
            "range-value-positions": false,
            "invalid-values":        'ignore',
            "collation":             'http://marklogic.com/collation/',
            "namespace-uri":         ''
        }, {
            "scalar-type":           'string',
            "localname":             'cat',
            "range-value-positions": false,
            "invalid-values":        'ignore',
            "collation":             'http://marklogic.com/collation/',
            "namespace-uri":         ''
        }]
    });
    // the app server
    const srvs = space.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
