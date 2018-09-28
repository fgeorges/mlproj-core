#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing goat - url rewriter and error handler', ass => {
    let path = t.spaceFile(ctxt, 'simple-goat', 'dev');
    let env  = new e.Environ(ctxt, ctxt.platform.json(path), path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, { port: '7070' });
    ass.equal('The @code param', env.param('@code'), 'simple-goat');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], null, 'simple-goat-content', []);
    ass.database('The modules db', dbs[1], null, 'simple-goat-modules', []);
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], null, 'simple-goat', 'Default',
               'simple-goat-content', 'simple-goat-modules', {
                   "server-type":   'http',
                   port:            7070,
                   root:            '/',
                   "url-rewriter":  '/plumbing/rewriter.sjs',
                   "error-handler": '/plumbing/errors.sjs'
               });
});
