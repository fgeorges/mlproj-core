#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing dog - complex db topology and references/embedding', ass => {
    let path = t.spaceFile(ctxt, 'simple-dog', 'prod');
    let env  = new e.Environ(ctxt, ctxt.platform.json(path), path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, {});
    ass.equal('The @code param', env.param('@code'), 'simple-dog');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 8 databases', dbs.length, 8);
    ass.database('The triggers db', dbs[0], null, 'simple-dog-triggers', []);
    ass.database('The security db', dbs[1], 'security', 'simple-dog-security', [],
                 null, 'simple-dog-security');
    ass.database('The schema-2 db', dbs[2], null, 'simple-dog-schema-2', [],
                 null, 'simple-dog-security');
    ass.database('The schema-4 db', dbs[3], null, 'simple-dog-schema-4', [],
                 null, 'simple-dog-security');
    ass.database('The schema-1 db', dbs[4], null, 'simple-dog-schema-1', [],
                 'simple-dog-schema-2', 'simple-dog-security', 'simple-dog-triggers');
    ass.database('The schema-3 db', dbs[5], null, 'simple-dog-schema-3', [],
                 'simple-dog-schema-4', 'simple-dog-security');
    ass.database('The content db',  dbs[6], 'content', 'simple-dog-content', [],
                 'simple-dog-schema-1');
    ass.database('The modules db',  dbs[7], null, 'simple-dog-modules', [],
                 'simple-dog-schema-3');
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], null, 'simple-dog', 'Default',
               'simple-dog-content', 'simple-dog-modules', {
                   "server-type": 'http',
                   port:          7040,
                   root:          '/'
               });
});
