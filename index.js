"use strict";

(function() {

    const cmd   = require('./src/commands');
    const err   = require('./src/error');
    const space = require('./src/space');

    module.exports = {
        Platform      : space.Platform,
        Display       : space.Display,
        NewCommand    : cmd.NewCommand,
        ShowCommand   : cmd.ShowCommand,
        SetupCommand  : cmd.SetupCommand,
        LoadCommand   : cmd.LoadCommand,
        DeployCommand : cmd.DeployCommand,
        MlprojError   : err.MlprojError
    }
}
)();
