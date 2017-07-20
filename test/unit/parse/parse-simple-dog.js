#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const s = require('../../../src/space');

const platform = new p.Platform();

t.test('Simple dog parsing', ass => {
    let path  = t.spaceFile('simple-dog', 'prod');
    let space = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters', space, {});
    ass.equal('The @code param', space.param('@code'), 'simple-dog');
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
    ass.equal('There must be 8 database', dbs.length, 8);
    ass.database('The triggers db', dbs[0], null, 'simple-dog-triggers', ['simple-dog-triggers-001']);
    ass.database('The security db', dbs[1], 'security', 'simple-dog-security',
                 ['simple-dog-security-001'], null, 'simple-dog-security');
    ass.database('The schema-2 db', dbs[2], null, 'simple-dog-schema-2',
                 ['simple-dog-schema-2-001'], null, 'simple-dog-security');
    ass.database('The schema-4 db', dbs[3], null, 'simple-dog-schema-4',
                 ['simple-dog-schema-4-001'], null, 'simple-dog-security');
    ass.database('The schema-1 db', dbs[4], null, 'simple-dog-schema-1', ['simple-dog-schema-1-001'],
                 'simple-dog-schema-2', 'simple-dog-security', 'simple-dog-triggers');
    ass.database('The schema-3 db', dbs[5], null, 'simple-dog-schema-3', ['simple-dog-schema-3-001'],
                 'simple-dog-schema-4', 'simple-dog-security');
    ass.database('The content db',  dbs[6], 'content', 'simple-dog-content',
                 ['simple-dog-content-001'], 'simple-dog-schema-1');
    ass.database('The modules db',  dbs[7], null, 'simple-dog-modules',
                 ['simple-dog-modules-001'], 'simple-dog-schema-3');    
    // the app server
    const srvs = space.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], null, 'simple-dog', 'Default',
               'simple-dog-content', 'simple-dog-modules', {
                   "server-type": 'http',
                   port:          7040,
                   root:          '/'
               });
});
