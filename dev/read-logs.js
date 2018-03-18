#!/usr/bin/node

const fs = require('fs');

const dir = '/tmp/mltrace/2017-11-28T22-36-20-039Z/';

fs.readdirSync(dir)
    .filter(f => {
        return f.endsWith('.json') && ! f.endsWith('-params.json');
    })
    .sort((lhs, rhs) => {
        if ( lhs === rhs ) return 0;
        else if ( lhs < rhs ) return -1;
        else return 1;
    })
    .forEach(f => {
        let json = JSON.parse(fs.readFileSync(dir + f));
        if ( f.endsWith('-request.json') ) {
            console.log(json.verb + ' ' + json.url);
        }
        else if ( f.endsWith('-response.json') ) {
            console.log('  <= ' + json.status);
        }
        else {
            throw new Error('What the heck is that file: ' + f);
        }
    });
