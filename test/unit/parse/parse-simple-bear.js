#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing bear - range indexes', ass => {
    let path = t.spaceFile(ctxt, 'simple-bear', 'prod');
    let env  = new e.Environ(ctxt, ctxt.platform.json(path), path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters',  env, {});
    ass.equal('The @code param',  env.param('@code'),     'simple-bear');
    ass.equal('The @title param', env.param('@title'),
              'Example with 2 names in the same range index');
    ass.equal('The @host param',  env.param('@host'),     'ml911');
    ass.equal('The @user param',  env.param('@user'),     'admin');
    ass.equal('The @pwd param',   env.param('@password'), 'admin');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 1 database', dbs.length, 1);
    ass.database('The one db', dbs[0], null, 'simple-bear', ['simple-bear-001-001'], null, null, null, {
        "range-path-index": [],
        "range-element-attribute-index": [],
        "range-element-index": [{
            "scalar-type":           'string',
            "localname":             'ape',
            "namespace-uri":         '',
            "range-value-positions": false,
            "invalid-values":        'ignore',
            "collation":             'http://marklogic.com/collation/'
        }, {
            "scalar-type":           'string',
            "localname":             'bear',
            "namespace-uri":         '',
            "range-value-positions": false,
            "invalid-values":        'ignore',
            "collation":             'http://marklogic.com/collation/'
        }, {
            "scalar-type":           'string',
            "localname":             'cat',
            "namespace-uri":         '',
            "range-value-positions": false,
            "invalid-values":        'ignore',
            "collation":             'http://marklogic.com/collation/'
        }]
    });
    // the app server
    const srvs = env.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
