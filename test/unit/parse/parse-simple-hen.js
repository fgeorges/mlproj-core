#!/usr/bin/env node

"use strict";

const p = require('./parse-platform');
const t = require('../lib/unit-test');
const e = require('../../../src/environ');

const ctxt = new p.Context();

t.test('Parsing hen - fast searches and output parameters', ass => {
    let path = t.spaceFile(ctxt, 'simple-hen', 'prod');
    let env  = new e.Environ(ctxt, path);
    env.compile();
    // the $* and @* params
    ass.params('The parameters', env, { port: '7080' });
    ass.equal('The @code param', env.param('@code'), 'simple-hen');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], 'content', 'simple-hen-content',
                 ['simple-hen-content-001'], null, null, null, {
                     "fast-case-sensitive-searches"            : true,
                     "fast-diacritic-sensitive-searches"       : false,
                     "fast-element-character-searches"         : false,
                     "fast-element-phrase-searches"            : true,
                     "fast-element-trailing-wildcard-searches" : true,
                     "fast-element-word-searches"              : false,
                     "fast-phrase-searches"                    : false,
                     "fast-reverse-searches"                   : true
                 });
    ass.database('The modules db', dbs[1], null, 'simple-hen-modules', ['simple-hen-modules-001']);
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], null, 'simple-hen', 'Default',
               'simple-hen-content', 'simple-hen-modules', {
                   "server-type"                        : 'http',
                   port                                 : 7080,
                   root                                 : '/',
                   "output-byte-order-mark"             : 'no',
                   "output-cdata-section-localname"     : 'code-snippet',
                   "output-cdata-section-namespace-uri" : 'http://example.org/ns'
               });
});
