"use strict";

(function() {

    const chalk = require('chalk');
    const fs    = require('fs');
    const path  = require('path');
    const c     = require('../../../src/context');
    const e     = require('../../../src/environ');
    const prj   = require('../../../src/project');
    const debug = require('debug')('mlproj:debug');
    const trace = require('debug')('mlproj:trace');

    // utility functions to create expected HTTP calls

    // used also as a marker
    function ignore(msg, resp, body) {
        const res = {
            msg: msg,
            ignore: true,
            response: resp
        };
        if ( body ) {
            res.body = body;
        }
        return res;
    }

    function dbProps(msg, name) {
        return {
            msg: msg,
            verb: 'get',
            params: {api: 'manage'},
            url: '/databases/' + name + '/properties',
            response: 'Not found'
        };
    }

    function asProps(msg, name) {
        return {
            msg: msg,
            verb: 'get',
            params: {api: 'manage'},
            url: '/servers/' + name + '/properties?group-id=Default',
            response: 'Not found'
        };
    }

    function forests(msg, list) {
        return {
            msg: msg,
            verb: 'get',
            params: {api: 'manage'},
            url: '/forests',
            response: 'OK',
            body: {
                'forest-default-list': {
                    'list-items': {
                        'list-item': list.map(f => {
                            var res = { nameref: f };
                            return res;
                        })
                    } } }
        };
    }

    function forestProps(msg, name, props) {
        const res = {
            msg: msg,
            verb: 'get',
            params: {api: 'manage'},
            url: '/forests/' + name + '/properties',
            response: 'OK'
        };
        if ( props ) {
            res.body = props;
        }
        return res;
    }

    function createDb(msg, props) {
        return {
            msg: msg,
            verb: 'post',
            params: {api: 'manage'},
            url: '/databases',
            data: props,
            response: 'OK'
        };
    }

    function createForest(msg, props) {
        return {
            msg: msg,
            verb: 'post',
            params: {api: 'manage'},
            url: '/forests',
            data: props,
            response: 'OK'
        };
    }

    function attachForest(msg, forest, db) {
        return {
            msg: msg,
            verb: 'post',
            params: {api: 'manage'},
            url: '/forests/' + forest + '?state=attach&database=' + db,
            response: 'OK'
        };
    }

    function createAs(msg, props) {
        return {
            msg: msg,
            verb: 'post',
            params: {api: 'manage'},
            url: '/servers?group-id=Default',
            data: props,
            response: 'OK'
        };
    }

            msg: msg,
            ignore: true,
            response: resp
        };
        if ( body ) {
            res.body = body;
        }
        return res;
    }

    // function to assert the current HTTP call (they are in sequence)

    function assertCall(runner, verb, params, url, data) {
        // get the current expected call
        const call = runner.nextCall();
        if ( ! call ) {
            throw new Error(`More requests than expected: ${verb} {${params.api}}${url}`);
        }
        // log progress
        runner.progress(call.msg, verb, params, url, data);
        // assert objects (like `data` or `params`)
        const assertObj = (call, left, right) => {
            let lhs = Object.keys(left).sort();
            let rhs = Object.keys(right).sort();
            // number of props
            if ( lhs.length !== rhs.length ) {
                runner.fail(call, 'Not the same number of props: ' + lhs + ' / ' + rhs);
            }
            // prop names
            for ( let i = 0; i < lhs.length; ++i ) {
                if ( lhs[i] !== rhs[i] ) {
                    runner.fail(call, 'Not the same prop keys: ' + lhs + ' / ' + rhs);
                }
            }
            // prop values
            lhs.forEach(p => {
                const l = left[p];
                const r = right[p];
                if ( typeof l === 'object' && typeof r === 'object' ) {
                    assertObj(call, l, r);
                }
                else if ( l !== r ) {
                    runner.fail(call, 'Object prop differs: ' + p + ': ' + l + ' - ' + r);
                }
            });
        };
        if ( ! call.ignore ) {
            // assert values
            if ( call.url !== url ) {
                runner.fail(call, 'URL is ' + url + ', expected ' + call.url);
            }
            if ( call.verb !== verb ) {
                runner.fail(call, 'Verb is ' + verb + ', expected ' + call.verb);
            }
            if ( call.params ) {
                if ( ! call.params !== ! params ) {
                    trace('actual params:');
                    trace('%O', params);
                    runner.fail(call, 'One param set is undefined: ' + call.params + ' - ' + params);
                }
                assertObj(call, call.params, params);
            }
            if ( call.data && call.data !== ignore ) {
                if ( ! call.data !== ! data ) {
                    trace('data sent:');
                    trace('%O', data);
                    runner.fail(call, 'One data is undefined: ' + call.data + ' - ' + data);
                }
                assertObj(call, call.data, data);
            }
        }
        // continue with expected result
        if ( call.response === 'OK' ) {
            return {
                status  : 200,
                headers : {},
                body    : call.body
            };
        }
        else if ( call.response === 'Not found' ) {
            return {
                status  : 404,
                headers : {}
            };
        }
        else {
            runner.fail(call, 'Unknown return');
            // TODO: Throw an error, even here...?
            return;
        }
    };

    function makeCtxt(runner) {
        // the platform instance
        const ctxt = new c.Context(new c.Display(), new c.Platform(process.cwd()));
        // override the http functions
        ctxt.platform.get = function(params, url) {
            return assertCall(runner, 'get', params, url);
        };
        ctxt.platform.post = function(params, url, data) {
            return assertCall(runner, 'post', params, url, data);
        };
        ctxt.platform.put = function(params, url, data) {
            return assertCall(runner, 'put', params, url, data);
        };
        // various functions on the platform object to load the project file
        ctxt.platform.resolve = function(href, base) {
            return path.resolve(base, href);
        };
        ctxt.platform.dirname = function(href) {
            return path.dirname(href);
        }
        ctxt.platform.read = function(path) {
            return fs.readFileSync(path, 'utf8');
        }
        ctxt.platform.bold = function(s) {
            return s;
        };
        ctxt.platform.green = function(s) {
            return s;
        };
        ctxt.platform.yellow = function(s) {
            return s;
        };
        ctxt.platform.exists = function(path) {
            return fs.existsSync(path);
        };
        ctxt.platform.projectXml = function(path) {
            if ( path.endsWith('/test/projects/simple-chimay/xproject/project.xml') ) {
                return {
                    name:    'http://mlproj.org/example/simple-chimay',
                    abbrev:  'simple-chimay',
                    version: '0.1.0',
                    title:   'Some test.'
                };
            }
            else {
                throw new Error(`Unexpected location to parse as XML: ${path}`);
            }
        };
        // TODO: Ignore the output for now, but redirect it to a file...
        ctxt.platform.log = function(msg) {
        };
        ctxt.platform.info = function(msg) {
        };
        ctxt.platform.warn = function(msg) {
        };
        ctxt.display.add = function(indent, verb, msg, arg) {
        };
        ctxt.display.check = function(indent, msg, arg) {
        };
        ctxt.display.info = function(msg) {
        };
        // flag to throw errors directly, instead of accumulating them
        ctxt.throwErrors = true
        return ctxt;
    }

    // the main processing
    function test(runner, path, environ, name, cmd, calls) {
        // set the expected calls on the runner object
        runner.calls(calls);
        // make the context
        const ctxt = makeCtxt(runner);
        // make the environ (from a project or an environ file)
        let env;
        if ( environ ) {
            env = new prj.Project(ctxt, path).environ(environ);
        }
        else {
            env = new e.Environ(ctxt, ctxt.platform.json(path), path);
            env.compile();
        }
        // launch processing
        let command = new cmd(name, {}, {}, ctxt, env);
        let actions = command.prepare();
        actions.execute();
    }

    module.exports = {
        ignore       : ignore,
        dbProps      : dbProps,
        asProps      : asProps,
        forests      : forests,
        forestProps  : forestProps,
        createDb     : createDb,
        createForest : createForest,
        attachForest : attachForest,
        createAs     : createAs,
        assertCall   : assertCall,
        test         : test
    }
}
)();
