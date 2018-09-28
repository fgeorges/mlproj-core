#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing frog - lexicons', ass => {
    let path = t.spaceFile(ctxt, 'simple-frog', 'prod');
    let env  = new e.Environ(ctxt, ctxt.platform.json(path), path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, {});
    ass.equal('The @code param', env.param('@code'), 'simple-frog');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 1 database', dbs.length, 1);
    ass.database('The content db',  dbs[0], null, 'simple-frog-content', [], null, null, null, {
        "uri-lexicon":        false,
        "collection-lexicon": true
    });
    // the app server
    const srvs = env.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
