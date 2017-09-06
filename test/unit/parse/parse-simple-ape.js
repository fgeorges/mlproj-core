#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing ape (base module) - parameters and typical topology', ass => {
    let path = t.spaceFile(ctxt, 'simple-ape', 'base');
    let mod  = new e.Module(ctxt, path);
    mod.loadImports();
    mod.compile(mod);
    // the $* and @* params
    ass.params('The parameters',  mod, { port: '7010' });
    ass.equal('The @code param',  mod.param('@code'),  'simple-ape');
    ass.equal('The @title param', mod.param('@title'), 'Simple base space example');
    // the source sets
    const srcs = mod._sources;
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = mod._databases;
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], null, 'simple-ape-content', ['simple-ape-content-001']);
    ass.database('The modules db', dbs[1], null, 'simple-ape-modules', ['simple-ape-modules-001']);
    // the app server
    const srvs = mod._servers;
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'server', 'simple-ape', 'Default',
               'simple-ape-content', 'simple-ape-modules', {
                   "server-type": 'http',
                   port:          7010,
                   root:          '/'
               });
});

t.test('Parsing ape (dev module) - overriding and inheritence', ass => {
    let path = t.spaceFile(ctxt, 'simple-ape', 'dev');
    let mod  = new e.Module(ctxt, path);
    mod.loadImports();
    mod.compile(mod);
    // the $* and @* params
    ass.params('The parameters',  mod, { port: '7010' });
    ass.equal('The @code param',  mod.param('@code'), 'simple-ape');
    ass.empty('The @title param', mod.param('@title'));
    // the source sets
    const srcs = mod._sources;
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = mod._databases;
    ass.equal('There must be 2 databases', dbs.length, 1);
    ass.database('The content db', dbs[0], null, 'simple-ape-content', ['simple-ape-content-001']);
    // the app server
    const srvs = mod._servers;
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'server', 'simple-ape', 'Default',
               'simple-ape-content', null, { "server-type": 'http', port: 7010 });
});

t.test('Parsing ape (base) - parameters and typical topology', ass => {
    let path = t.spaceFile(ctxt, 'simple-ape', 'base');
    let env  = new e.Environ(ctxt, path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters',  env, { port: '7010' });
    ass.equal('The @code param',  env.param('@code'),  'simple-ape');
    ass.equal('The @title param', env.param('@title'), 'Simple base space example');
    // the API details
    ass.api('manage', env.api('manage'), 'manage/v2', 8002, false);
    ass.api('client', env.api('client'), 'v1',        8000, false);
    ass.api('xdbc',   env.api('xdbc'),   '',          8000, false);
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], null, 'simple-ape-content', ['simple-ape-content-001']);
    ass.database('The modules db', dbs[1], null, 'simple-ape-modules', ['simple-ape-modules-001']);
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'server', 'simple-ape', 'Default',
               'simple-ape-content', 'simple-ape-modules', {
                   "server-type": 'http',
                   port:          7010,
                   root:          '/'
               });
});

t.test('Parsing ape (dev) - overriding and inheritence', ass => {
    ctxt.platform.environ = undefined; // reset
    let path = t.spaceFile(ctxt, 'simple-ape', 'dev');
    let env  = new e.Environ(ctxt, path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters',  env, { port: '7010' });
    ass.equal('The @code param',  env.param('@code'), 'simple-ape');
    ass.empty('The @title param', env.param('@title'));
    // the API details
    ass.api('manage', env.api('manage'), 'manage/v2', 8002, false);
    ass.api('client', env.api('client'), 'v1',        8000, false);
    ass.api('xdbc',   env.api('xdbc'),   '',          8000, false);
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 2 databases', dbs.length, 1);
    ass.database('The content db', dbs[0], null, 'simple-ape-content', ['simple-ape-content-001']);
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'server', 'simple-ape', 'Default',
               'simple-ape-content', null, { "server-type": 'http', port: 7010 });
});
