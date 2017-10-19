#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing impala (prod) - source sets', ass => {
    let path = t.spaceFile(ctxt, 'simple-impala', 'prod');
    let env  = new e.Environ(ctxt, ctxt.platform.json(path), path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, { port: '7090' });
    ass.equal('The @code param', env.param('@code'), 'simple-impala');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be 3 source sets', srcs.length, 3);
    ass.source('The foo source', srcs[0], 'foo', {
        dir:     'foo',
        include: ['*.xqy', '*.xql', '*.xq']
    });
    ass.equal('The garbage of foo source', srcs[0].prop('garbage'), ['*~']);
    ass.source('The foo source', srcs[1], 'bar', {
        dir:     'bar',
        exclude: ['*.bck', '*.ignore']
    });
    ass.equal('The garbage of bar source', srcs[1].prop('garbage'), ['*~']);
    ass.source('The baz source', srcs[2], 'baz', {
        dir:     'baz',
        include: ['*.jpg', '*.png'],
        exclude: ['*ignore*', '*2017*']
    });
    ass.equal('The garbage of baz source', srcs[2].prop('garbage'), ['*~']);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], null, 'simple-impala-content');
    ass.database('The modules db', dbs[1], null, 'simple-impala-modules');
    // the app servers
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], null, 'simple-impala', 'Default',
               'simple-impala-content', 'simple-impala-modules');
});

t.test('Parsing impala (extended) - source sets inheritence', ass => {
    ctxt.platform.environ = undefined; // reset
    let path = t.spaceFile(ctxt, 'simple-impala', 'extended');
    let env  = new e.Environ(ctxt, ctxt.platform.json(path), path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, { port: '7090' });
    ass.equal('The @code param', env.param('@code'), 'simple-impala');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be 3 source sets', srcs.length, 3);
    ass.source('The foo source', srcs[0], 'foo', {
        dir:     'foo',
        include: ['*.sjs']
    });
    ass.equal('The garbage of foo source', srcs[0].prop('garbage'), ['*~', '$$$']);
    ass.source('The foo source', srcs[1], 'bar', {
        dir:     'newbar',
        exclude: ['*.bck', '*.ignore']
    });
    ass.equal('The garbage of bar source', srcs[1].prop('garbage'), ['*~', '$$$']);
    ass.source('The baz source', srcs[2], 'baz', {
        dir:     'baz',
        include: ['*.jpg', '*.png'],
        exclude: ['*ignore*', '*2017*']
    });
    ass.equal('The garbage of baz source', srcs[2].prop('garbage'), ['*~', '$$$']);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], null, 'simple-impala-content');
    ass.database('The modules db', dbs[1], null, 'simple-impala-modules');
    // the app servers
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], null, 'simple-impala', 'Default',
               'simple-impala-content', 'simple-impala-modules');
});
