#!/usr/bin/env node

"use strict";

const chalk    = require('chalk');
const fs       = require('fs');
const scenario = require('./lib/scenario');
const cmd      = require('../../src/commands');
const debug    = require('debug')('mlproj:debug');

var tests = [];
if ( process.argv.length === 2 ) {
    [ 'init', 'setup' ].forEach(dir => addDir(tests, dir));
}
else if ( process.argv.length !== 3 ) {
    console.log('Must have exactly one option (the path to the scenario file to run)');
    process.exit(1);
}
else if ( isDir(process.argv[2]) ) {
    addDir(tests, process.argv[2]);
}
else {
    tests.push(process.argv[2]);
}

function isScenario(path) {
    return path.endsWith('.js');
}

function isDir(path) {
    return fs.statSync(path).isDirectory();
}

function addDir(tests, dir) {
    if ( dir.endsWith('/') ) {
        dir = dir.slice(0, dir.length - 1);
    }
    fs.readdirSync(dir).forEach(f => {
        var p = dir + '/' + f;
        if ( isDir(p) ) {
            addDir(tests, p);
        }
        else if ( isScenario(p) ) {
            tests.push(p);
        }
    });
}

// TODO: Move the lib/scenario.js functions in this class.
// Simplifies the interface of tests, they receive just the runner object.
//
class TestRunner
{
    constructor() {
        this.nextIdx = 0;
        this.history = [];
    }

    calls(calls) {
        this._calls = calls;
    }

    nextCall() {
        return this._calls[this.nextIdx++];
    }

    callsLeft() {
        return this._calls.length - this.nextIdx;
    }

    progress(msg, verb, params, url, data) {
        // push this call in history
        var hist = {
            msg  : msg,
            verb : verb,
            api  : params.api,
            url  : url
        };
        if ( data ) {
            hist.data = data;
        }
        this.history.push(hist);
        // log this call
        debug(`${msg}\t-- ${verb.toUpperCase()} {${params.api}}${url}`);
        debug('  params: %o', params);
    }

    fail(call, msg) {
        this.history.slice(0, -1).forEach(h => {
            console.log('  ' + chalk.green('✔') + ' ' + h.msg);
        });
        console.log('  ' + chalk.red('✘') + ' ' + call.msg);
        console.log('      ' + msg);
        var err = new Error(msg);
        err.expected = call;
        err.actual   = this.history[this.history.length - 1];
        throw err;
    }
}

var failures = [];
tests.forEach(test => {
    try {
        var t = test;
        if ( t[0] !== '.' ) {
            t = './' + t;
        }
        console.log(test);
        const runner = new TestRunner();
        require(t).test(runner, scenario, cmd, './');
        // any expected call left?
        const left = runner.callsLeft();
        if ( left ) {
            throw new Error(`Still ${left} expected request(s) left`);
        }
        console.log(chalk.green('✔') + ' Scenario passed');
    }
    catch ( err ) {
        console.log(chalk.red('✘') + ' Scenario failed');
        // test failure
        if ( err.expected ) {
            failures.push({
                test     : test,
                msg      : err.message,
                expected : err.expected,
                actual   : err.actual
            });
        }
        // any other error
        else {
            failures.push({
                test : test,
                err  : err
            });
        }
    }
    console.log();
});

if ( failures.length ) {
    console.log('Some scenario failed.');
}
else {
    console.log('All scenarii passed!');
}
console.log();
failures.forEach(f => {
    if ( f.err ) {
        console.log(chalk.red('Error') + ': ' + f.test);
        console.log(f.err);
    }
    else {
        console.log(chalk.red('Failure') + ': ' + f.test);
        console.log(f.msg);
    }
    console.log();
});
