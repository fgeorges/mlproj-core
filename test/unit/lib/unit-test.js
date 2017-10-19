"use strict";

// TODO: This lib is (almost) duplicated in mlproj, do we want to change that?

(function() {

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

        _same(msg, actual, expected, cmp) {
            // two cases where one is an array bot not the other one
            if ( Array.isArray(actual) && ! Array.isArray(expected) ) {
                this.fail(msg + ': is an array but not expected to be');
            }
            else if ( ! Array.isArray(actual) && Array.isArray(expected) ) {
                this.fail(msg + ': is not an array but expected to be');
            }
            // case for arrays
            else if ( Array.isArray(actual) ) {
                if ( actual.length !== expected.length ) {
                    this.fail(msg + ': arrays not same length (' + actual.length
                              + ' vs. ' + expected.length + ')');
                }
                else {
                    for ( let i = 0; i < actual.length; ++i ) {
                        cmp(msg + ' #' + i, actual[i], expected[i]);
                    }
                }
            }
            // case for simple values (what for objects?)
            else {
                cmp(msg, actual, expected);
            }
        }

        equal(msg, actual, expected) {
            this._same(msg, actual, expected, (m, a, e) => {
                if ( a !== e ) {
                    this.fail(m + ': value is not equal (' + a + ' vs. ' + e + ')');
                }
            });
        }

        jsonObject(msg, actual, expected) {
            if ( Array.isArray(actual) ) {
                if ( ! Array.isArray(expected) ) {
                    this.fail(msg + ': got an array, should got: ' + typeof expected);
                }
                else if ( actual.length !== expected.length ) {
                    this.fail(msg + ': arrays of different lengths: ' + actual.length + '/' + expected.length);
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
                this._same(msg + ': ' + n + ' prop', actual[n].value, expected[n], (m, a, e) => {
                    if ( typeof e === 'object' ) {
                        this.props(m, a, e);
                    }
                    else {
                        this.equal(m, a, e);
                    }
                });
            }
        }

        database(msg, db, id, name, forests, schema, security, triggers, props) {
            if ( ! db ) {
                this.fail(msg + ': no such database');
                return;
            }
            if ( id ) {
                this.equal(msg + ': id', db.id, id);
            }
            this.equal(msg + ': name', db.name, name);
            if ( forests ) {
                this.equal(msg + ': forests num', Object.keys(db.forests).length, forests.length);
                for ( let i = 0; i < forests.length; ++i ) {
                    let n = forests[i];
                    this.exist(msg + ': forest ' + n, db.forests[n]);
                }
            }
            if ( schema ) {
                this.exist(msg + ': schema', db.schema);
                this.equal(msg + ': schema', db.schema && db.schema.name, schema);
            }
            else {
                this.empty(msg + ': schema', db.schema);
            }
            if ( security ) {
                this.exist(msg + ': security', db.security);
                this.equal(msg + ': security', db.security && db.security.name, security);
            }
            else {
                this.empty(msg + ': security', db.security);
            }
            if ( triggers ) {
                this.exist(msg + ': triggers', db.triggers);
                this.equal(msg + ': triggers', db.triggers && db.triggers.name, triggers);
            }
            else {
                this.empty(msg + ': triggers', db.triggers);
            }
            if ( props ) {
                this.props(msg + ': props', db.props, props);
            }
        }

        server(msg, srv, id, name, group, content, modules, props) {
            if ( ! srv ) {
                this.fail(msg + ': no such server');
                return;
            }
            if ( id ) {
                this.equal(msg + ': id', srv.id, id);
            }
            this.equal(msg + ': name',  srv.name,  name);
            this.equal(msg + ': group', srv.group, group);
            if ( content ) {
                this.exist(msg + ': content db', srv.content);
                this.equal(msg + ': content db', srv.content && srv.content.name, content);
            }
            else {
                this.empty(msg + ': content db', srv.content);
            }
            if ( modules ) {
                this.exist(msg + ': modules db', srv.modules);
                this.equal(msg + ': modules db', srv.modules && srv.modules.name, modules);
            }
            else {
                this.empty(msg + ': modules db', srv.modules);
            }
            if ( props ) {
                this.props(msg + ': props', srv.props, props);
            }
        }

        source(msg, src, name, props) {
            if ( ! src ) {
                this.fail(msg + ': no such source');
                return;
            }
            this.equal(msg + ': name',  src.name,  name);
            this.props(msg + ': props', src.props, props || {});
        }

        mime(msg, m, name, props) {
            if ( ! m ) {
                this.fail(msg + ': no such MIME type');
                return;
            }
            this.equal(msg + ': name',  m.name,  name);
            this.props(msg + ': props', m.props, props || {});
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

    function spaceFile(ctxt, group, name) {
        return ctxt.platform.resolve('../environs/' + group + '/' + name + '.json');
    }

    function projectDir(ctxt, name) {
        return ctxt.platform.resolve('../projects/' + name + '/');
    }

    module.exports = {
        test       : test,
        spaceFile  : spaceFile,
        projectDir : projectDir
    }
}
)();
