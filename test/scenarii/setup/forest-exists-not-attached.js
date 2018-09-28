"use strict";

(function() {

    function test(runner, scenario, cmd, base) {
        const path = '../environs/simple-hen/prod.json';
        return scenario.test(runner, path, null, 'setup', cmd.SetupCommand, [
            scenario.privileges('Get privilege list', []),
            scenario.dbProps('Get content DB props', 'simple-hen-content'),
            scenario.dbProps('Get modules DB props', 'simple-hen-modules'),
            scenario.ignore('Get AS props', 'Not found'),
            scenario.ignore('Create content DB', 'OK'),
            scenario.ignore('Create modules DB', 'OK'),
            scenario.ignore('Create AS', 'OK')
        ]);
    }

    module.exports = {
        test : test
    }
}
)();
