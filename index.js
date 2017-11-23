"use strict";

(function() {

    const action = require('./src/action');
    const cmd    = require('./src/commands');
    const err    = require('./src/error');
    const env    = require('./src/environ');
    const prj    = require('./src/project');
    const ctxt   = require('./src/context');

    module.exports = {
        Context              : ctxt.Context,
        Display              : ctxt.Display,
        Platform             : ctxt.Platform,
        Environ              : env.Environ,
        Project              : prj.Project,
        NewCommand           : cmd.NewCommand,
        MigrateGradleCommand : cmd.MigrateGradleCommand,
        ShowCommand          : cmd.ShowCommand,
        SetupCommand         : cmd.SetupCommand,
        LoadCommand          : cmd.LoadCommand,
        DeployCommand        : cmd.DeployCommand,
        RunCommand           : cmd.RunCommand,
        error                : err,
        actions              : action
    }
}
)();
