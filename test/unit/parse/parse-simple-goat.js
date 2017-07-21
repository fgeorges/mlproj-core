#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const s = require('../../../src/space');

const platform = new p.Platform();

t.test('Parsing goat - url rewriter and error handler', ass => {
    let path  = t.spaceFile('simple-goat', 'dev');
    let space = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters', space, { port: '7070' });
    ass.equal('The @code param', space.param('@code'), 'simple-goat');
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], null, 'simple-goat-content', ['simple-goat-content-001']);
    ass.database('The modules db', dbs[1], null, 'simple-goat-modules', ['simple-goat-modules-001']);
    // the app server
    const srvs = space.servers();
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
