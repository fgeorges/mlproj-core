"use strict";

(function() {

    function test(runner, scenario, cmd, base) {
        return scenario.test(
            runner,
            base + '../environs/simple-hen/prod.json',
            'setup',
            cmd.SetupCommand,
            [
                scenario.forests(
                    'Get forest list',
                    []),
                scenario.forests(
                    'Get forest list',
                    []),
                scenario.dbProps(
                    'Get content DB props',
                    'simple-hen-content'),
                scenario.forests(
                    'Get forest list',
                    []),
                scenario.dbProps(
                    'Get modules DB props',
                    'simple-hen-modules_XXX'),
                scenario.forests(
                    'Get forest list',
                    []),
                scenario.asProps(
                    'Get AS props',
                    'simple-hen'),
                scenario.createDb(
                    'Create content DB',
                    {
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
                scenario.createForest(
                    'Create content forest',
                    {
                        'forest-name': 'simple-hen-content-001-001',
                        'database': 'simple-hen-content',
                        'host': 'ml911'
                    }),
                scenario.createDb(
                    'Create modules DB',
                    { 'database-name': 'simple-hen-modules' }),
                scenario.createForest(
                    'Create modules forest',
                    {
                        'forest-name': 'simple-hen-modules-001-001',
                        'database': 'simple-hen-modules',
                        'host': 'ml911'
                    }),
                scenario.createAs(
                    'Create AS',
                    {
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
