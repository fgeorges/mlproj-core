"use strict";

(function() {

    const cmd   = require('./src/commands');
    const space = require('./src/space');

    module.exports = {
        Platform      : space.Platform,
        Display       : space.Display,
        NewCommand    : cmd.NewCommand,
        ShowCommand   : cmd.ShowCommand,
        SetupCommand  : cmd.SetupCommand,
        LoadCommand   : cmd.LoadCommand,
        DeployCommand : cmd.DeployCommand
    }
}
)();
