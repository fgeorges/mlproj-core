#!/usr/bin/env node

"use strict";

const t = require('../lib/unit-test');
const e = require('../../../src/environ');
const p = require('../../../src/project');

const ctxt = new (require('./parse-platform').Context)();
const path = t.projectDir(ctxt, 'simple-achel');
const proj = new p.Project(ctxt, path);

t.test('Parsing achel (project) - the project itself', ass => {
    ass.exist('The path',    proj.path);
    ass.equal('The name',    proj.name,    'http://mlproj.org/example/simple-achel');
    ass.equal('The abbrev',  proj.abbrev,  'simple-achel');
    ass.equal('The version', proj.version, '0.1.0');
    ass.equal('The title',   proj.title,   'Simple, full-fledged example project');
});

t.test('Parsing achel (base) - parameters and typical topology', ass => {
    let env = proj.environ('base');
    // the $* and @* params
    ass.params('The parameters', env, { port: '6010' });
    ass.equal('The @code param', env.param('@code'),  'simple-achel');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be 1 source set', srcs.length, 1);
    ass.source('The src source', srcs[0], 'src', { dir: 'src' });
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 1 database', dbs.length, 1);
    ass.database('The content db', dbs[0], 'content', 'simple-achel-content', []);
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'app', 'simple-achel', 'Default',
               'simple-achel-content', null, {
                   "server-type": 'http',
                   port:          6010,
                   rootDir:       '/test/unit/src/'
               });
});

t.test('Parsing achel (dev) - inheritence and connection info', ass => {
    ctxt.platform.environ = undefined; // reset
    let env = proj.environ('dev');
    // the $* and @* params
    ass.params('The parameters', env, { port: '6010' });
    ass.equal('The @code param',     env.param('@code'),     'simple-achel');
    ass.equal('The @host param',     env.param('@host'),     'localhost');
    ass.equal('The @user param',     env.param('@user'),     'admin');
    ass.equal('The @password param', env.param('@password'), 'admin');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be 1 source set', srcs.length, 1);
    ass.source('The src source', srcs[0], 'src', { dir: 'src' });
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 1 database', dbs.length, 1);
    ass.database('The content db', dbs[0], 'content', 'simple-achel-content', []);
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'app', 'simple-achel', 'Default',
               'simple-achel-content', null, {
                   "server-type": 'http',
                   port:          6010,
                   rootDir:       '/test/unit/src/'
               });
});

t.test('Parsing achel (prod) - inheritence and connection info', ass => {
    ctxt.platform.environ = undefined; // reset
    let env = proj.environ('prod');
    // the $* and @* params
    ass.params('The parameters', env, { port: '6010' });
    ass.equal('The @code param', env.param('@code'), 'simple-achel');
    ass.equal('The @host param', env.param('@host'), 'prod.server');
    ass.equal('The @user param', env.param('@user'), 'admin');
    // the source sets
    const srcs = env.sources();
    ass.equal('There must be 1 source set', srcs.length, 1);
    ass.source('The src source', srcs[0], 'src', { dir: 'src' });
    // the databases
    const dbs = env.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The modules db', dbs[0], 'modules', 'simple-achel-modules', []);
    ass.database('The content db', dbs[1], 'content', 'simple-achel-content', []);
    // the app server
    const srvs = env.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'app', 'simple-achel', 'Default',
               'simple-achel-content', 'simple-achel-modules', {
                   "server-type": 'http',
                   port:          6010,
                   root:          '/'
               });
});
