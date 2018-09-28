"use strict";

(function() {

    function test(runner, scenario, cmd, base) {
        const path = '../environs/simple-hen/prod.json';
        return scenario.test(runner, path, null, 'setup', cmd.SetupCommand, [
            scenario.privileges('Get privilege list', []),
            scenario.dbProps('Get content DB props', 'simple-hen-content'),
            scenario.dbProps('Get modules DB props', 'simple-hen-modules'),
            scenario.asProps('Get AS props', 'simple-hen'),
            scenario.createDb('Create content DB', {
                'database-name': 'simple-hen-content',
                'fast-case-sensitive-searches': true,
                'fast-diacritic-sensitive-searches': false,
                'fast-element-character-searches': false,
                'fast-element-phrase-searches': true,
                'fast-element-trailing-wildcard-searches': true,
                'fast-element-word-searches': false,
                'fast-phrase-searches': false,
                'fast-reverse-searches': true
            }),
            scenario.createDb( 'Create modules DB', {
                'database-name': 'simple-hen-modules'
            }),
            scenario.createAs('Create AS', {
                'server-name': 'simple-hen',
                'content-database': 'simple-hen-content',
                'modules-database': 'simple-hen-modules',
                'server-type': 'http',
                'port': 7080,
                'output-byte-order-mark': 'no',
                'output-cdata-section-localname': 'code-snippet',
                'output-cdata-section-namespace-uri': 'http://example.org/ns',
                'root': '/'
            })
        ]);
    }

    module.exports = {
        test : test
    }
}
)();
