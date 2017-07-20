#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const s = require('../../../src/space');

const platform = new p.Platform();

t.test('Simple cat parsing', ass => {
    let path  = t.spaceFile('simple-cat', 'prod');
    let space = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters', space, {});
    ass.equal('The @code param', space.param('@code'), 'simple-cat');
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
    ass.equal('There must be 4 database', dbs.length, 4);
    ass.database('The schema db',   dbs[0], null, 'simple-cat-schema',   ['simple-cat-schema-001']);
    ass.database('The security db', dbs[1], null, 'simple-cat-security', ['simple-cat-security-001']);
    ass.database('The triggers db', dbs[2], null, 'simple-cat-triggers', ['simple-cat-triggers-001']);
    ass.database('The content db',  dbs[3], null, 'simple-cat-content',  ['simple-cat-content-001'],
                 'simple-cat-schema', 'simple-cat-security', 'simple-cat-triggers');
    // the app server
    const srvs = space.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
