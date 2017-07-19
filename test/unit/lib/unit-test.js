"use strict";

// TODO: This lib is (almost) duplicated in mlproj, do we want to change that?

(function() {

    const mockery = require('mockery');
    mockery.enable({
        warnOnUnregistered: false
    });
    // requires mlproj-core to be cloned next to mlproj...
    mockery.registerSubstitute('mlproj-core', '../../mlproj-core/index.js');

    const chalk = require('chalk');

    function success(msg) {
        console.log(chalk.green('✔') + ' ' + msg);
    }

    function fail(msg) {
        console.log(chalk.red('✘') + ' ' + msg);
    }

    class Assert
    {
        constructor() {
            this.failures = [];
        }

        fail(msg) {
            this.failures.push({ msg: msg });
        }

        empty(msg, actual) {
            if ( actual !== null && actual !== undefined ) {
                this.fail(msg + ': value is not empty');
            }
        }

        exist(msg, actual) {
            if ( actual === null || actual === undefined ) {
                this.fail(msg + ': value is empty');
            }
        }

        equal(msg, actual, expected) {
            if ( actual !== expected ) {
                this.fail(msg + ': value is not equal');
            }
        }

        jsonObject(msg, actual, expected) {
            if ( Array.isArray(actual) ) {
                if ( ! Array.isArray(expected) ) {
                    this.fail(msg + ': got an array, should got: ' + typeof expected);
                }
                else if ( actual.length !== expected.length ) {
                    this.fail(msg + ': arrays of different lengths: ' + actual.expected + '/' + expected.length);
                }
                else {
                    actual.forEach((act, i) => {
                        let exp = expected[i];
                        if ( (typeof act) === 'object' ) {
                            this.jsonObject(msg, act, exp);
                        }
                        else if ( act !== exp ) {
                            this.fail(msg + ': array members differ at ' + i + ': ' + act + ' / ' + exp);
                        }
                    });
                }
            }
            else if ( (typeof actual) === 'object' ) {
                if ( (typeof expected) !== 'object' ) {
                    this.fail(msg + ': got an object, should got: ' + typeof expected);
                }
                else {
                    let lhs = Object.keys(actual).sort();
                    let rhs = Object.keys(expected).sort();
                    if ( lhs.length !== rhs.length ) {
                        this.fail(msg + ': object of different keys: ' + lhs + ' / ' + rhs);
                    }
                    else {
                        for ( let same = true, i = 0; same && i < lhs.length; ++i ) {
                            let key = lhs[i];
                            if ( key !== rhs[i] ) {
                                this.fail(msg + ': object of different keys: ' + lhs + ' / ' + rhs);
                            }
                            else {
                                let act = actual[key];
                                let exp = expected[key];
                                if ( (typeof act) === 'object' ) {
                                    this.jsonObject(msg, act, exp);
                                }
                                else if ( act !== exp ) {
                                    this.fail(msg + ': object entries differ at ' + key + ': ' + act + ' / ' + exp);
                                }
                            }
                        }
                    }
                }
            }
            else {
                this.fail(msg + ': only objects are allowed: ' + typeof actual);
            }
        }

        error(msg, fun, expected) {
            try {
                fun();
                this.fail(msg + ': should throw the error: ' + expected);
            }
            catch ( err ) {
                if ( err.message !== expected ) {
                    this.fail(msg + ': the error message should be: ' + expected);
                }
            }
        }

        api(name, actual, root, port, ssl) {
            this.jsonObject('The ' + name + ' API', actual, { root: root, port: port, ssl: ssl });
        };

        params(msg, space, expected) {
            const actual = space.params();
            this.equal(msg + ': num of params', actual.length, Object.keys(expected).length);
            for ( let i = 0; i < actual.length; ++i ) {
                let n = actual[i];
                this.equal(msg + ': ' + n + ' param', space.param(n), expected[n]);
            }
        }

        props(msg, actual, expected) {
            const keys = Object.keys(actual);
            this.equal(msg + ': num of props', keys.length, Object.keys(expected).length);
            for ( let i = 0; i < keys.length; ++i ) {
                let n = keys[i];
                this.equal(msg + ': ' + n + ' prop', actual[n].value, expected[n]);
            }
        }

        database(msg, db, id, name, forests, schema, security, triggers, props) {
            if ( id ) {
                this.equal(msg + ': id',          db.name, id);
            }
            this.equal(msg + ': name',        db.name, name);
            this.equal(msg + ': forests num', Object.keys(db.forests).length, forests.length);
            for ( let i = 0; i < forests.length; ++i ) {
                let n = forests[i];
                this.exist(msg + ': forest ' + n, db.forests[n]);
            }
            if ( schema ) {
                this.exist(msg + ': schema', db.schema);
                this.equal(msg + ': schema', db.schema.name);
            }
            else {
                this.empty(msg + ': schema', db.schema);
            }
            if ( security ) {
                this.exist(msg + ': security', db.security);
                this.equal(msg + ': security', db.security.name);
            }
            else {
                this.empty(msg + ': security', db.security);
            }
            if ( triggers ) {
                this.exist(msg + ': triggers', db.triggers);
                this.equal(msg + ': triggers', db.triggers.name);
            }
            else {
                this.empty(msg + ': triggers', db.triggers);
            }
            this.props(msg + ': props', db.props, props || {});
        }

        server(msg, srv, id, name, group, content, modules, props) {
            if ( id ) {
                this.equal(msg + ': id',    srv.id,    id);
            }
            this.equal(msg + ': name',  srv.name,  name);
            this.equal(msg + ': group', srv.group, group);
            if ( content ) {
                this.exist(msg + ': content db', srv.content);
                this.equal(msg + ': content db', srv.content.name, content);
            }
            else {
                this.empty(msg + ': content db', srv.content);
            }
            if ( modules ) {
                this.exist(msg + ': modules db', srv.modules);
                this.equal(msg + ': modules db', srv.modules.name, modules);
            }
            else {
                this.empty(msg + ': modules db', srv.modules);
            }
            this.props(msg + ': props', srv.props, props || {});
        }
    }

    function test(desc, fun) {
        let ass = new Assert();
        // TODO: Catch errors...
        fun(ass);
        if ( ass.failures.length ) {
            fail(desc);
            ass.failures.forEach(f => {
                console.log('    - ' + f.msg);
            });
        }
        else {
            success(desc);
        }
    }

    function spaceFile(group, name) {
        return '../environs/' + group + '/' + name + '.json';
    }

    module.exports = {
        test      : test,
        spaceFile : spaceFile
    }
}
)();
