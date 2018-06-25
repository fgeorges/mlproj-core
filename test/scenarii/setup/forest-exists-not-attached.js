"use strict";

(function() {

    function test(runner, scenario, cmd, base) {
        const path = '../environs/simple-hen/prod.json';
        return scenario.test(runner, path, null, 'setup', cmd.SetupCommand, [
            scenario.forests(
                'Get forest list',
                [ 'simple-hen-content-001-001', 'simple-hen-modules-001-001' ]),
            scenario.forestProps(
                'Get content forest props',
                'simple-hen-content-001-001',
                { host: 'ml911' }),
            scenario.forests(
                'Get forest list',
                [ 'simple-hen-content-001-001', 'simple-hen-modules-001-001' ]),
            scenario.forestProps(
                'Get modules forest props',
                'simple-hen-modules-001-001',
                { host: 'ml911' }),
            scenario.dbProps(
                'Get content DB props',
                'simple-hen-content'),
            scenario.forests(
                'Get forest list',
                [ 'simple-hen-content-001-001', 'simple-hen-modules-001-001' ]),
            scenario.forestProps(
                'Get content forest props',
                'simple-hen-content-001-001',
                { host: 'ml911' }),
            scenario.dbProps(
                'Get modules DB props',
                'simple-hen-modules'),
            scenario.forests(
                'Get forest list',
                [ 'simple-hen-content-001-001', 'simple-hen-modules-001-001' ]),
            scenario.forestProps(
                'Get modules forest props',
                'simple-hen-modules-001-001',
                { host: 'ml911' }),
            scenario.ignore(
                'Get AS props',
                'Not found'),
            scenario.ignore(
                'Create content DB',
                'OK'),
            scenario.attachForest(
                'Attach content forest',
                'simple-hen-content-001-001',
                'simple-hen-content'),
            scenario.ignore(
                'Create modules DB',
                'OK'),
            scenario.attachForest(
                'Attach modules forest',
                'simple-hen-modules-001-001',
                'simple-hen-modules'),
            scenario.ignore(
                'Create AS',
                'OK')
        ]);
    }

    module.exports = {
        test : test
    }
}
)();
