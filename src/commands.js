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
            const action = new act.FunAction('Create a new project', ctxt => {
                const pf    = ctxt.platform;
                const vars  = this.args;
                const force = vars.force;

                // create `src/`
                // TODO: Create `test/` as well, when supported.
                var srcdir = pf.resolve('src/', vars.dir);
                pf.mkdir(srcdir, force);

                // create `xproject/` and `xproject/project.xml`
                var xpdir = pf.resolve('xproject/', vars.dir);
                pf.mkdir(xpdir, force);
                pf.write(pf.resolve('project.xml', xpdir), NEW_PROJECT_XML(vars), force);

                // create `xproject/mlenvs/` and `xproject/mlenvs/{base,default,dev,prod}.json`
                var mldir = pf.resolve('mlenvs/', xpdir);
                pf.mkdir(mldir, force);
                pf.write(pf.resolve('base.json',    mldir), NEW_BASE_ENV(vars),    force);
                pf.write(pf.resolve('default.json', mldir), NEW_DEFAULT_ENV(vars), force);
                pf.write(pf.resolve('dev.json',     mldir), NEW_DEV_ENV(vars),     force);
                pf.write(pf.resolve('prod.json',    mldir), NEW_PROD_ENV(vars),    force);
                pf.write(pf.resolve('example.js',   mldir), NEW_EXAMPLE_ENV(vars), force);

                action.xpdir = xpdir;
            });
            var actions = new act.ActionList(this.ctxt);
            actions.add(action);
            return actions;
        }
    }

    /*~
     * Display the resolved environ.
     *
     * TODO: Allow different flags to show different components (--databases, --servers,
     * etc.)  And their negative flags (--no-database, --no-server, etc.), as well as
     * composite flags (e.g. --security and --no-security for roles and permissions.)
     */
    class ShowCommand extends Command
    {
        prepare() {
            const actions = new act.ActionList(this.ctxt);
	    if ( this.args.json ) {
                actions.add(new act.FunAction('Dump the environ as JSON', ctxt => {
		    // the name is in , e.g. to save into mlenvs/dumps/{name}.json
		    const res = {
                        mlproj: {
                            format:   'dump/0.1',
			    name:     this.environ.name,
			    when:     new Date().toISOString(),
			    environs: []
                        }
		    };
		    const dump = (mod) => {
			res.mlproj.environs.push({
			    path: mod.path,
			    href: mod.href,
			    json: { mlproj: mod.json }
			});
			mod.imports.forEach(i => dump(i));
		    };
		    dump(this.environ.module);
		    ctxt.platform.log(JSON.stringify(res, null, 3));
		}));
            }
	    else {
                actions.add(new act.FunAction('Display the environ details', ctxt => {
                    const components = comps => {
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
                    components(this.environ.execPrivileges());
                    components(this.environ.uriPrivileges());
                    components(this.environ.roles());
                    components(this.environ.users());
		}));
	    }
            return actions;
        }
    }

    /*~
     * Initialize a new MarkLogic instance or cluster.
     *
     * TODO: Have an option to generate host names automatically, using animal
     * names from A to Z?  And maybe using adjectives if more than 26?  As well
     * as using host names in the forest and forest replica names, instead of
     * another number in the forest name.
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
            const kind = this.args.kind;
throw new Error(`TODO: Make sure to implement the new kind of init: ${kind}`);
            switch ( kind ) {
            case undefined:
                console.warn(`KIND undefined`);
                break;
            case 'host':
            case 'master':
                console.warn(`KIND host/master`);
                break;
            case 'extra':
                console.warn(`KIND extra`);
                break;
            case 'cluster':
                console.warn(`KIND cluster`);
                break;
            default:
                throw new Error(`Unknown kind in init: ${kind}`);
            }
            const key      = this.args.key;
            const licensee = this.args.licensee;
            // the action list
            const actions = new act.ActionList(this.ctxt);
            const hosts   = this.environ.hosts();
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
            const actions = new act.ActionList(this.ctxt);
            // setup a specific component?
            const what = this.args.what;
            // the components to setup
            let comps = [];
            // are roles part of them? (to update permissions after creation of *all* roles)
            let haveRoles = false;
            if ( what === 'databases' ) {
                comps = this.environ.databases();
            }
            else if ( what === 'servers' ) {
                comps = this.environ.servers();
            }
            else if ( what === 'mimetypes' ) {
                comps = this.environ.mimetypes();
            }
            else if ( what === 'privileges' ) {
                const execs = this.environ.execPrivileges();
                const uris  = this.environ.uriPrivileges();
                comps = execs.concat(uris);
            }
            else if ( what === 'roles' ) {
                haveRoles = true;
                comps = this.environ.roles();
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
                haveRoles = true;
                const dbs   = this.environ.databases();
                const srvs  = this.environ.servers();
                const mimes = this.environ.mimetypes();
                const execs = this.environ.execPrivileges();
                const uris  = this.environ.uriPrivileges();
                const roles = this.environ.roles();
                const users = this.environ.users();
                comps = dbs.concat(srvs, mimes, execs, uris, roles, users);
            }
            // do it
            comps.forEach(comp => {
                comp.setup(actions, this.ctxt.display);
            });
            if ( haveRoles && this.environ.roles().length ) {
                // check permissions on roles (might depend on creation of other roles)
                actions.add(new act.FunAction(null, ctxt => {
                    this.environ.roles().forEach(role => {
                        role.updatePermissions(actions, this.ctxt.display);
                    });
                }));
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
                    if ( src.targets().length > 1 ) {
                        const targets = src.targets().map(c => `id:${c.id}|name:${c.name}`);
                        throw new Error(`Several targets attached to the source set ${src.name}: ${targets}`);
                    }
                    else if ( src.targets().length === 1 ) {
                        if ( src.targets()[0] instanceof cmp.Database ) {
                            return src.targets()[0];
                        }
                        else {
                            srv = src.targets()[0];
                            return isDeploy ? srv.modules : srv.content;
                        }
                    }
                    // ...or db/srv sources
                    else if ( src.sourcesOf().length > 1 ) {
                        const dbs = src.sourcesOf().map(db => `id:${db.id}|name:${db.name}`);
                        throw new Error(`Several the source set ${src.name} is attached to several databases: ${dbs}`);
                    }
                    else if ( src.sourcesOf().length === 1 ) {
                        return src.sourcesOf()[0];
                    }
                    // ...or defaults
                    else {
                        var srvs = this.environ.servers();
                        if ( srvs.length === 1 ) {
                            srv = srvs[0];
                        }
                        else if ( isDeploy ) {
                            const res = this.environ.databases().find(db => db.id === 'modules');
                            if ( res ) {
                                return res;
                            }
                            else {
                                throw new Error('Not exactly one server in the environ, and no database with id modules');
                            }
                        }
                        else {
                            var dbs = this.environ.databases();
                            if ( dbs.length === 1 ) {
                                return dbs[0];
                            }
                            else {
                                const res = this.environ.databases().find(db => db.id === 'content');
                                if ( res ) {
                                    return res;
                                }
                                else {
                                    throw new Error('Not exactly one server or database in the environ, and no database with id content');
                                }
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
                if ( src ) {
                    const res = this.environ.source(src);
                    if ( ! res ) {
                        throw new Error(`No such source set with name: ${src}`);
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
                let cmd = this.environ.command(name);
                if ( ! cmd ) {
                    throw new Error('Unknown user command: ' + name);
                }
                let impl = this.getImplem(cmd);
                actions.add(new act.FunAction('Apply the user command: ' + name, ctxt => {
                    let apis = new api.Apis(this);
                    impl.call(this, apis, this.environ, this.ctxt);
                }, cmd.dryable));
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

    // helper function for the command `new`, to create xproject/mlproj.json
    function NEW_MLPROJ_JSON(vars)
    {
        return `{
    "mlproj": {
        "config": {
            "comment": {
                "message": "Remove the comment level and this message to enable tracing.",
                "trace": {
                    "dir": "/tmp/mlproj"
                }
            }
        }
    }
}
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

    // helper function for the command `new`, to create xproject/mlenvs/example.js
    function NEW_EXAMPLE_ENV(vars)
    {
        return `// This is an example environment file written in JavaScript, instead of JSON.
//
// It allows you to create the environment object dynamically, using any type of
// logic you want (e.g. to create a complex arrangement of forest in a cluster
// of hundreds of nodes,) as well as providing actual functions as values
// (e.g. for implementing user commands, than can then be invoked from the
// command line.)
//
// The introduction of the first page below contains more details, and the
// second page below contains more examples:
//
// - http://mlproj.org/environs
// - http://mlproj.org/user-commands

module.exports = () => {
    return {
        mlproj: {
            format: '0.1',
            import: 'base.json',
            commands: {
                databases: (apis) => {
                    apis.manage()
                        .databases()
                        .forEach(db => console.log(db));
                }
            }
        }
    };
};
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
