#!/usr/bin/env node

"use strict";

const fs   = require('fs');
const path = require('path');
const t    = require('../lib/unit-test');
const s    = require('../../../src/space');
const err  = require('../../../src/error');

class Platform extends s.Platform
{
    constructor() {
        super(true, true);
    }

    read(path) {
        try {
            return fs.readFileSync(path, 'utf8');
        }
        catch (err) {
            if ( err.code === 'ENOENT' ) {
                throw err.noSuchFile(path);
            }
            else {
                throw err;
            }
        }
    }

    resolve(href, base) {
        if ( ! base ) {
            base = '.';
        }
        return path.resolve(base, href);
    }

    info(msg) {
        // ignore
    }
}

t.test('Simple ape parsing of base.json', ass => {
    let platform = new Platform();
    let path     = t.spaceFile('simple-ape', 'base');
    var space    = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters',  space, { port: '7010' });
    ass.equal('The @code param',  space.param('@code'),  'simple-ape');
    ass.equal('The @title param', space.param('@title'), 'Simple base space example');
    // the API details
    ass.api('management', space.api('management'), 'manage/v2', 8002, false);
    ass.api('client',     space.api('client'),     'v1',        8000, false);
    ass.api('xdb',        space.api('xdbc'),       '',          8000, false);
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
    ass.equal('There must be 2 databases', dbs.length, 2);
    ass.database('The content db', dbs[0], null, 'simple-ape-content', ['simple-ape-content-001']);
    ass.database('The modules db', dbs[1], null, 'simple-ape-modules', ['simple-ape-modules-001']);
    // the app server
    const srvs = space.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'server', 'simple-ape', 'Default',
               'simple-ape-content', 'simple-ape-modules', {
                   "server-type": 'http',
                   port:          7010,
                   root:          '/'
               });
});

t.test('Simple ape parsing of dev.json', ass => {
    let platform = new Platform();
    let path     = t.spaceFile('simple-ape', 'dev');
    var space    = s.Space.load(platform, path, {}, {}, {});
    // the $* and @* params
    ass.params('The parameters',  space, { port: '7010' });
    ass.equal('The @code param',  space.param('@code'), 'simple-ape');
    // FIXME: Fails now, but shoudl not be inherited, should it?
    ass.empty('The @title param', space.param('@title'));
    // the API details
    ass.api('management', space.api('management'), 'manage/v2', 8002, false);
    ass.api('client',     space.api('client'),     'v1',        8000, false);
    ass.api('xdb',        space.api('xdbc'),       '',          8000, false);
    // the source sets
    const srcs = space.sources();
    ass.equal('There must be no source set', srcs.length, 0);
    // the databases
    const dbs = space.databases();
    ass.equal('There must be 2 databases', dbs.length, 1);
    ass.database('The content db', dbs[0], null, 'simple-ape-content', ['simple-ape-content-001']);
    // the app server
    const srvs = space.servers();
    ass.equal('There must be 1 app server', srvs.length, 1);
    ass.server('The server', srvs[0], 'server', 'simple-ape', 'Default',
               'simple-ape-content', null, { "server-type": 'http', port: 7010});
});
