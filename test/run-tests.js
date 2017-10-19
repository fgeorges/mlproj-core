#!/usr/bin/env node

"use strict";

// TODO: This script is duplicated in mlproj, do we want to change that?

var chproc = require('child_process');
var proc   = require('process');

function run(tests, callback)
{
    if ( ! tests.length ) {
        // nothing else to do
        return;
    }
    // the current test
    const test = tests.shift();
    // is there a message to display?
    if ( test.msg ) {
        console.log(test.msg);
    }
    // is there a dir to go to...?
    if ( test.cwd ) {
        proc.chdir(test.cwd);
        run(tests);
    }
    // ...or a script to execute?
    else if ( test.script ) {
        // keep track of whether callback has been invoked to prevent multiple invocations
        var invoked = false;
        var process = chproc.fork(test.script);

        // listen for errors as they may prevent the exit event from firing
        process.on('error', function () {
            if ( invoked ) {
                return;
            }
            invoked = true;
            throw new Error(err);
        });

        // execute the callback once the process has finished running
        process.on('exit', function (code) {
            if ( invoked ) {
                return;
            }
            invoked = true;
            if ( code ) {
                throw new Error('exit code ' + code);
            }
            run(tests);
        });
    }
}

// first go to test dir
proc.chdir('./test/');

run([
    { msg: '## Run unit tests', cwd: './unit/' },
    { msg: '\nParse ape',      script: './parse/parse-simple-ape.js'      },
    { msg: '\nParse bear',     script: './parse/parse-simple-bear.js'     },
    { msg: '\nParse cat',      script: './parse/parse-simple-cat.js'      },
    { msg: '\nParse dog',      script: './parse/parse-simple-dog.js'      },
    { msg: '\nParse elephant', script: './parse/parse-simple-elephant.js' },
    { msg: '\nParse frog',     script: './parse/parse-simple-frog.js'     },
    { msg: '\nParse goat',     script: './parse/parse-simple-goat.js'     },
    { msg: '\nParse hen',      script: './parse/parse-simple-hen.js'      },
    { msg: '\nParse impala',   script: './parse/parse-simple-impala.js'   },
    { msg: '\nParse jaguar',   script: './parse/parse-simple-jaguar.js'   },
    { msg: '\nParse achel',    script: './parse/parse-simple-achel.js'    },
    { msg: '\nMerge indexes',  script: './parse/merge-indexes.js'         },
    { msg: '\n## Run test scenarii\n', cwd: '../scenarii/' },
    { script: './run-scenario.js' }
]);
