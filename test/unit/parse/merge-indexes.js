#!/usr/bin/env node

"use strict";

const t   = require('../lib/unit-test');
const cmp = require('../../../src/components');

function range(type, name, pos, invalid) {
    return { type: type, name: name, positions: pos, invalid: invalid };
}

function test(title, base, derived, expected) {
    t.test(title, ass => {
        ass.jsonObject(
            'The merged indexes',
            cmp.Database.merge('indexes', derived, base),
            expected);
    });
}

// [] + [] = []
test(
    'Merge empty range indexes',
    { ranges: [] },
    { ranges: [] },
    { ranges: [] });

// ape + bear = bear,ape
test(
    'Add a range index in derived to base',
    { ranges: [ range('string', 'ape',  true, 'ignore') ] },
    { ranges: [ range('string', 'bear', true, 'ignore') ] },
    { ranges: [ range('string', 'bear', true, 'ignore'),
                range('string', 'ape',  true, 'ignore') ] });

// ape,bear + bear = bear,ape
test(
    'Override a range index in derived from base',
    { ranges: [ range('string', 'ape',  true,  'ignore'),
                range('string', 'bear', true,  'ignore') ] },
    { ranges: [ range('string', 'bear', false, 'error')  ] },
    { ranges: [ range('string', 'bear', false, 'error'),
                range('string', 'ape',  true,  'ignore') ] });

// [] + ape,bear = ape,bear
test(
    'Expand range indexes with name array in derived',
    { ranges: [] },
    { ranges: [ range('string', ['ape','bear'], true, 'ignore') ] },
    { ranges: [ range('string', 'ape',          true, 'ignore'),
                range('string', 'bear',         true, 'ignore') ] });

// ape,bear + bear = bear,ape
test(
    'Override a range index in derived from base with name array',
    { ranges: [ range('string', ['ape','bear'], true,  'ignore') ] },
    { ranges: [ range('string', 'bear',         false, 'error')  ] },
    { ranges: [ range('string', 'bear',         false, 'error'),
                range('string', 'ape',          true,  'ignore') ] });

// ape,bear + bear = bear,ape
test(
    'Override a range index in derived from base, bith with name array',
    { ranges: [ range('string', ['ape','bear'], true,  'ignore') ] },
    { ranges: [ range('string', ['bear','cat'], false, 'error')  ] },
    { ranges: [ range('string', 'bear',         false, 'error'),
                range('string', 'cat',          false, 'error'),
                range('string', 'ape',          true,  'ignore') ] });
