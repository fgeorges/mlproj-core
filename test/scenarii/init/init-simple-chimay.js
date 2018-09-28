"use strict";

(function() {

    function test(runner, scenario, cmd, base) {
        const path = '../projects/simple-chimay/';
        return scenario.test(runner, path, 'jupiter', 'init', cmd.InitCommand, [
            scenario.forests('Get forest list', []),
            scenario.privileges('Get privilege list', []),
            // init master
            scenario.init('Init master', 'jupiter'),
            scenario.instanceAdmin('Instance admin', 'jupiter'),
            // init and add extra host
            scenario.init('Init extra host', 'jupiter', 5201),
            scenario.serverConfig('Get config server', 'jupiter', 5201),
            scenario.registerHost('Register host to cluster'),
            scenario.clusterConfig('Push cluster config to host', 'jupiter', 5201),
        ]);
    }

    module.exports = {
        test : test
    }
}
)();
