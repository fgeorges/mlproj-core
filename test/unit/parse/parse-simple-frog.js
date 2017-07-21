#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const s = require('../../../src/space');

const platform = new p.Platform();

t.test('Parsing frog - lexicons', ass => {
    let path  = t.spaceFile('simple-frog', 'prod');
    let space = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters', space, {});
    ass.equal('The @code param', space.param('@code'), 'simple-frog');
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
    ass.equal('There must be 1 database', dbs.length, 1);
    ass.database('The content db',  dbs[0], null, 'simple-frog-content',
                 ['simple-frog-content-001'], null, null, null, {
                     "uri-lexicon":        false,
                     "collection-lexicon": true
                 });
    // the app server
    const srvs = space.servers();
    ass.equal('There must be no app server', srvs.length, 0);
});
