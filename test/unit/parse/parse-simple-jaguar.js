#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing jaguar - mime types', ass => {
    let path = t.spaceFile(ctxt, 'simple-jaguar', 'prod');
    let env  = new e.Environ(ctxt, path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, {});
    ass.equal('The @code param', env.param('@code'), 'simple-jaguar');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be no database', dbs.length, 0);
    // the app servers
    const srvs = env.servers();
    ass.equal('There must be no app server', srvs.length, 0);
    // the mime types
    const mimes = env.mimetypes();
    ass.equal('There must be 2 MIME types', mimes.length, 2);
    ass.mime('The XQuery MIME type',   mimes[0], 'application/xquery', {
        format:     'text',
        extensions: ['xql', 'xq']
    });
    ass.mime('The Markdown MIME type', mimes[1], 'text/markdown', {
        format:     'text',
        extensions: ['md', 'mdown', 'markdown']
    });
});
