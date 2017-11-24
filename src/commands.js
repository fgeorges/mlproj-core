"use strict";

(function() {

    const act = require('./action');
    const cmp = require('./components');
    const err = require('./error');
    const api = require('./apis');

    /*~
     * The base class/interface for commands.
     */
    class Command
    {
        constructor(name, globalArgs, args, ctxt, environ) {
            this.name       = name;
            this.args       = args;
            this.globalArgs = globalArgs;
            this.ctxt       = ctxt;
            this.environ    = environ;
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
            var pf      = this.ctxt.platform;
            var actions = new act.ActionList(this.ctxt);
            actions.add(new act.FunAction('Create a new project', ctxt => {
                var pf    = ctxt.platform;
                var vars  = this.args;
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
            }, this));
            return actions;
        }
    }

    /*~
     * Display the resolved environ.
     */
    class ShowCommand extends Command
    {
        prepare() {
            var actions = new act.ActionList(this.ctxt);
            actions.add(new act.FunAction('Display the environ details', ctxt => {
                var components = comps => {
                    comps.forEach(c => {
                        c.show(ctxt.display);
                    });
                };
                if ( this.environ.proj ) {
                    this.environ.proj.show();
                }
                this.environ.show();
                components(this.environ.databases());
                components(this.environ.servers());
                components(this.environ.sources());
                components(this.environ.mimetypes());
                components(this.environ.users());
            }));
            return actions;
        }
    }

    /*~
     * Initialize a new MarkLogic instance or cluster.
     */
    class InitCommand extends Command
    {
        prepare() {
            let user = this.environ.param('@user');
            let pwd  = this.environ.param('@password');
            if ( ! user ) {
                throw new Error('No user in environ');
            }
            if ( ! pwd ) {
                throw new Error('No password in environ');
            }
            let key      = this.args.key;
            let licensee = this.args.licensee
            // the action list
            let actions = new act.ActionList(this.ctxt);
            let hosts   = this.environ.hosts();
            // if explicit hosts, init the cluster
            if ( hosts.length ) {
                let master = hosts[0];
                let extras = hosts.slice(1);
                master.init(actions, user, pwd, key, licensee);
                extras.forEach(e => e.join(actions, key, licensee, master));
            }
            // if no explicit host, init the implicit single node
            else {
                cmp.Host.init(actions, user, pwd, key, licensee);
            }
            return actions;
        }
    }

    /*~
     * Create the components from the environ on MarkLogic.
     */
    class SetupCommand extends Command
    {
        prepare() {
            // the action list
            let actions = new act.ActionList(this.ctxt);
            // setup a specific component?
            let what  = this.args.what;
            let comps = [];
            if ( what === 'databases' ) {
                comps = this.environ.databases();
            }
            else if ( what === 'servers' ) {
                comps = this.environ.servers();
            }
            else if ( what === 'mimetypes' ) {
                comps = this.environ.mimetypes();
            }
            else if ( what === 'users' ) {
                comps = this.environ.users();
            }
            else if ( what ) {
                let db  = this.environ.database(what);
                let srv = this.environ.server(what);
                // make sure there is exactly one
                if ( ! db && ! srv ) {
                    throw new Error('No such component: ' + what);
                }
                if ( db && srv ) {
                    throw new Error('More than one such component: ' + what);
                }
                // setup the one
                comps.push(db || srv);
            }
            else {
                // add all components
                var dbs   = this.environ.databases();
                var srvs  = this.environ.servers();
                var mimes = this.environ.mimetypes();
                var users = this.environ.users();
                comps = dbs.concat(srvs, mimes, users);
            }
            // do it
            comps.forEach(comp => {
                comp.setup(actions, this.ctxt.display);
            });
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
            // the action list
            var actions = new act.ActionList(this.ctxt);
            var srv;

            // utility: resolve the target db from args
            const target = (args, isDeploy, src) => {
                var as     = args.server;
                var db     = args.database;
                var system = args.systemDb;
                // if no explicit target, try...
                if ( ! as && ! db && ! system ) {
                    // ...source target(s)
                    if ( src.targets.length > 1 ) {
                        throw new Error('Several targets attached to the source set: ' + src.name);
                    }
                    else if ( src.targets.length === 1 ) {
                        if ( src.targets[0] instanceof cmp.Database ) {
                            return src.targets[0];
                        }
                        else {
                            srv = src.targets[0];
                            return isDeploy ? srv.modules : srv.content;
                        }
                    }
                    // ...or defaults
                    else {
                        var srvs = this.environ.servers();
                        if ( srvs.length === 1 ) {
                            srv = srvs[0];
                        }
                        else if ( isDeploy ) {
                            throw new Error('Not exactly one server in the environ');
                        }
                        else {
                            var dbs = this.environ.databases();
                            if ( dbs.length === 1 ) {
                                return dbs[0];
                            }
                            else {
                                throw new Error('Not exactly one server or database in the environ');
                            }
                        }
                    }
                }
                else if ( as ) {
                    srv = this.environ.server(as);
                    if ( ! srv ) {
                        throw err.noSuchSrv(as);
                    }
                }
                // if more than one explicit
                if ( (as && db) || (as && system) || (db && system) ) {
                    throw new Error('More than one option provided for --as, --db and --sys');
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
                    let res = this.environ.database(db);
                    if ( ! res ) {
                        throw err.noSuchDb(db);
                    }
                    return res;
                }
                // force the db name, e.g. for system databases
                else {
                    return new cmp.SysDatabase(system);
                }
            };

            // TODO: It should be possible to attach a source set to a db as well
            // (like data/ to content, schemas/ to schemas, src/ to modules...)
            //
            // So the commands "mlproj load schemas", "mlproj load @src schemas"
            // and "mlproj load @db schemas" are all the same...
            //
            // And of course to be able to set an extension loader in JS...  See
            // "invoker" for an example.
            //
            // utility: resolve the content source from args
            const content = (args, isDeploy) => {
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
                    return this.environ.source(arg) || new cmp.SourceDir(arg);
                }
                // if two explicit at same time
                if ( (src && dir) || (src && doc) || (dir && doc) ) {
                    throw new Error('Content options --src, --dir and --doc are mutually exclusive');
                }
                if ( args.sourceset ) {
                    const res = this.environ.source(args.sourceset);
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
            let src = content(this.args, this.isDeploy());
            let db  = target( this.args, this.isDeploy(), src);
            this.populateActions(actions, db, src, srv);

            return actions;
        }

        populateActions(actions, db, src, srv) {
            src.load(actions, db, srv, this.ctxt.display);
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

    /*~
     * Run user command.
     */
    class RunCommand extends Command
    {
        prepare() {
            let actions = new act.ActionList(this.ctxt);
            let name    = this.args.cmd;
            if ( name ) {
                actions.add(new act.FunAction('Apply the user command: ' + name, ctxt => {
                    let cmd = this.environ.command(name);
                    if ( ! cmd ) {
                        throw new Error('Unknown user command: ' + name);
                    }
                    let impl = this.getImplem(cmd);
                    let apis = new api.Apis(this);
                    impl.call(this, apis, this.ctxt.environ, this.ctxt);
                }));
            }
            else {
                actions.add(new act.FunAction('List user commands', ctxt => {
                    this.environ.commands().forEach(c => {
                        ctxt.platform.log('- ' + c);
                    });
                }));
            }
            return actions;
        }

        getImplem(cmd) {
            if ( typeof cmd === "function" ) {
                return cmd;
            }
            else if ( typeof cmd === "object" ) {
                if ( typeof cmd.implem === "function" ) {
                    return cmd.implem;
                }
                else {
                    throw new Error('User command implem is not a function: ' + this.name);
                }
            }
            else {
                throw new Error('User command is not a function: ' + this.name);
            }
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
        InitCommand   : InitCommand,
        SetupCommand  : SetupCommand,
        LoadCommand   : LoadCommand,
        DeployCommand : DeployCommand,
        RunCommand    : RunCommand
    }
}
)();
