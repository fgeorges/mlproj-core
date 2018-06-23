#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing cat - schema, security and triggers dbs', ass => {
    let path = t.spaceFile(ctxt, 'simple-cat', 'prod');
    let env  = new e.Environ(ctxt, ctxt.platform.json(path), path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, {});
    ass.equal('The @code param', env.param('@code'), 'simple-cat');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 4 databases', dbs.length, 4);
    ass.database('The schema db',   dbs[0], null, 'simple-cat-schema',   ['simple-cat-schema-001-001']);
    ass.database('The security db', dbs[1], null, 'simple-cat-security', ['simple-cat-security-001-001']);
    ass.database('The triggers db', dbs[2], null, 'simple-cat-triggers', ['simple-cat-triggers-001-001']);
    ass.database('The content db',  dbs[3], null, 'simple-cat-content',  ['simple-cat-content-001-001'],
                 'simple-cat-schema', 'simple-cat-security', 'simple-cat-triggers');
    // the app server
    const srvs = env.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
