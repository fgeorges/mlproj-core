#!/usr/bin/env node

"use strict";

const t   = require('../lib/unit-test');
const cmp = require('../../../src/components');

function test(title, base, derived, expected) {
    t.test(title, ass => {
        ass.jsonObject(
            'The merged permissions',
            cmp.SourceSet.merge('permissions', derived, base),
            expected);
    });
}

// [] + [] = []
test(
    'Merge empty permissions',
    {},
    {},
    {});

// ape + bear = ape,bear
test(
    'Add a permission in derived to base',
    { ape:  'read' },
    { bear: 'read' },
    { ape:  'read',
      bear: 'read' });

// ape,bear + bear = ape,bear
test(
    'Override a permission in derived from base',
    { ape:  'read',
      bear: 'read'   },
    { bear: 'update' },
    { ape:  'read',
      bear: 'update' });
