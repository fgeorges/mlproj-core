"use strict";

(function() {

    const act = require('./action');
    const cmp = require('./components');
    const err = require('./error');
    const s   = require('./space');

    /*~
     * The base class/interface for commands.
     */
    class Command
    {
        constructor(globalArgs, cmdArgs, platform, display, project) {
            this.globalArgs = globalArgs;
            this.cmdArgs    = cmdArgs;
            this.platform   = platform;
            this.display    = display;
            this.project    = project;
        }

        prepare() {
            throw err.abstractFun('Command.prepare');
        }
    }

    /*~
     * Create a new project.
     */
    class NewCommand extends Command
    {
        prepare() {
            var pf      = this.platform;
            var actions = new act.ActionList(pf);
            actions.add(new act.FunAction('Create a new project', pf => {
                var vars  = this.cmdArgs;
                var force = vars.force;

                // create `src/`
                // TODO: Create `test/` as well, when supported.
                var srcdir = pf.resolve('src', vars.dir);
                pf.mkdir(srcdir, force);

                // create `xproject/` and `xproject/project.xml`
                var xpdir = pf.resolve('xproject', vars.dir);
                pf.mkdir(xpdir, force);
                pf.write(pf.resolve('project.xml', xpdir), NEW_PROJECT_XML(vars), force);

                // create `xproject/mlenvs/` and `xproject/mlenvs/{base,default,dev,prod}.json`
                var mldir = pf.resolve('mlenvs', xpdir);
                pf.mkdir(mldir, force);
                pf.write(pf.resolve('base.json',    mldir), NEW_BASE_ENV(vars),    force);
                pf.write(pf.resolve('default.json', mldir), NEW_DEFAULT_ENV(vars), force);
                pf.write(pf.resolve('dev.json',     mldir), NEW_DEV_ENV(vars),     force);
                pf.write(pf.resolve('prod.json',    mldir), NEW_PROD_ENV(vars),    force);

                this.xpdir  = xpdir;
            }));
            return actions;
        }
    }

    /*~
     * Display the resolved space.
     */
    class ShowCommand extends Command
    {
        prepare() {
            var actions = new act.ActionList(this.platform);
            actions.add(new act.FunAction('Display the environ details', pf => {
                var space = this.project.space;
                var components = comps => {
                    comps.forEach(c => {
                        c.show(this.display);
                    });
                };
                this.project.show(this.display);
                this.project.space.show(
                    this.display,
                    this.project.environ || this.project.path);
                components(space.databases());
                components(space.servers());
                components(space.sources());
            }));
            return actions;
        }
    }

    /*~
     * Create the components from the space on MarkLogic.
     */
    class SetupCommand extends Command
    {
        prepare() {
            // the action list
            var actions = new act.ActionList(this.platform);
            // add all components
            var dbs  = this.project.space.databases();
            var srvs = this.project.space.servers();
            for ( let comp of dbs.concat(srvs) ) {
                comp.setup(actions, this.display);
            }
            return actions;
        }
    }

    /*~
     * Load documents to a database.
     */
    class LoadCommand extends Command
    {
        isDeploy() {
            return false;
        }

        prepare() {
            // "global" variables
            var pf      = this.platform;
            var space   = this.project.space;
            var actions = new act.ActionList(pf);

            // utility: resolve the target db from args
            var target = function(args, isDeploy) {
                var as    = args.server;
                var db    = args.database;
                var force = args.forceDb;
                var srv;
                // if no explicit target, try defaults
                if ( ! as && ! db && ! force ) {
                    var srvs = space.servers();
                    if ( srvs.length === 1 ) {
                        srv = srvs[0];
                    }
                    else if ( isDeploy ) {
                        throw new Error('Not exactly one server in the environ');
                    }
                    else {
                        var dbs = space.databases();
                        if ( dbs.length === 1 ) {
                            return dbs[0];
                        }
                        else {
                            throw new Error('Not exactly one server or database in the environ');
                        }
                    }
                }
                else if ( as ) {
                    srv = space.server(as);
                    if ( ! srv ) {
                        throw err.noSuchSrv(as);
                    }
                }
                // if more than one explicit
                if ( (as && db) || (as && force) || (db && force) ) {
                    throw new Error('Both target options --db and --as provided');
                }
                // resolve from server if set
                else if ( srv ) {
                    let res = isDeploy
                        ? srv.modules
                        : srv.content;
                    if ( ! res ) {
                        throw err.serverNoDb(srv.name, isDeploy ? 'modules' : 'content');
                    }
                    return res;
                }
                // resolve from defined databases
                else if ( db ) {
                    let res = space.database(db);
                    if ( ! res ) {
                        throw err.noSuchDb(db);
                    }
                    return res;
                }
                // force the db name, e.g. for system databases
                else {
                    return new cmp.SysDatabase(force);
                }
            };

            // TODO: It should be possible to attach a srcdir to a db as well
            // (like data/ to content, schemas/ to schemas, src/ to modules...)
            //
            // So the commands "mlproj load schemas", "mlproj load @src schemas"
            // and "mlproj load @db schemas" are all the same...
            //
            // And of course to be able to set an extension loader in JS...  See
            // "invoker" for an example.
            //
            // utility: resolve the content source from args
            var content = function(args, isDeploy) {
                var dir = args.directory;
                var doc = args.document;
                var src = args.sourceset;
                // if no explicit target, try defaults
                if ( ! src && ! dir && ! doc ) {
                    var arg = args.what || (isDeploy ? 'src' : 'data'); // default value
                    // TODO: In addition to a source by name, what if we looked
                    // if there was a source attached to a directory equal to
                    // "arg"?  Won't change the dir used, but might make a
                    // difference if we use other props on the source...
                    return space.source(arg) || new cmp.SourceDir(arg);
                }
                // if two explicit at same time
                if ( (src && dir) || (src && doc) || (dir && doc) ) {
                    throw new Error('Content options --src, --dir and --doc are mutually exclusive');
                }
                if ( args.sourceset ) {
                    const res = space.source(args.sourceset);
                    if ( ! res ) {
                        throw new Error('No such source set with name: ' + args.sourceset);
                    }
                    return res;
                }
                else if ( dir ) {
                    return new cmp.SourceDir(dir);
                }
                else {
                    return new cmp.SourceDoc(doc);
                }
            }

            // do it: the actual execute() implem
            let db  = target( this.cmdArgs, this.isDeploy());
            let src = content(this.cmdArgs, this.isDeploy());
            this.populateActions(actions, db, src);

            return actions;
        }

        populateActions(actions, db, src) {
            src.load(actions, db, this.display);
        }
    }

    /*~
     * Deploy modules to a database.
     */
    class DeployCommand extends LoadCommand
    {
        isDeploy() {
            return true;
        }
    }

    // helper function for the command `new`, to create xproject/project.xml
    function NEW_PROJECT_XML(vars)
    {
        return `<project xmlns="http://expath.org/ns/project"
         name="${ vars.name }"
         abbrev="${ vars.abbrev }"
         version="${ vars.version }">

   <title>${ vars.title }</title>

</project>
`;
    }

    // helper function for the command `new`, to create xproject/mlenvs/base.json
    function NEW_BASE_ENV(vars)
    {
        return `{
    "mlproj": {
        "format": "0.1",
        "params": {
            "port": "${ vars.port }"
        },
        "sources": [{
            "name": "data",
            "dir":  "data"
        }, {
            "name": "src",
            "dir":  "src"
        }],
        "databases": [{
            "id": "content",
            "name": "@{code}-content"
        }],
        "servers": [{
            "id": "app",
            "name": "@{code}",
            "type": "http",
            "port": "\${port}",
            "content": {
                "idref": "content"
            }
        }]
    }
}
`;
    }

    // helper function for the command `new`, to create xproject/mlenvs/default.json
    function NEW_DEFAULT_ENV(vars)
    {
        return `{
    "mlproj": {
        "format": "0.1",
        "import": "dev.json"
    }
}
`;
    }

    // helper function for the command `new`, to create xproject/mlenvs/dev.json
    function NEW_DEV_ENV(vars)
    {
        return `{
    "mlproj": {
        "format": "0.1",
        "import": "base.json",
        "connect": {
            "host": "localhost",
            "user": "admin",
            "password": "admin"
        }
    }
}
`;
    }

    // helper function for the command `new`, to create xproject/mlenvs/prod.json
    function NEW_PROD_ENV(vars)
    {
        return `{
    "mlproj": {
        "format": "0.1",
        "import": "base.json",
        "connect": {
            "host": "prod.server",
            "user": "admin"
        },
        "databases": [{
            "id": "modules",
            "name": "@{code}-modules"
        }],
        "servers": [{
            "id": "app",
            "modules": {
                "idref": "modules"
            },
            "root": "/"
        }]
    }
}
`;
    }

    module.exports = {
        NewCommand    : NewCommand,
        ShowCommand   : ShowCommand,
        SetupCommand  : SetupCommand,
        LoadCommand   : LoadCommand,
        DeployCommand : DeployCommand
    }
}
)();
