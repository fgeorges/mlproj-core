"use strict";

(function() {

    const cmp = require('./components');
    const err = require('./error');

    /*~
     * Utility interface to abstract platform-dependent functionalities.
     */
    class Platform
    {
        // TODO:
        // `dry` should not be here, rather on TUI, WRT what to do with actions
        // `verbose` should not be here, rather on Display
        constructor(dry, verbose) {
            this.dry     = dry;
            this.verbose = verbose;
        }
        project(env, path, base, params, force, callback) {
            if ( env && path ) {
                throw new Error('Both `environ` and `path` set: ' + env + ', ' + path);
            }
            if ( ! env && ! path ) {
                try {
                    // unused here, just to see if it exists
                    this.read(this.resolve('xproject/mlenvs/default.json', base));
                    env = 'default';
                }
                catch (err) {
                    if ( err.name === 'no-such-file' ) {
                        throw new Error('Default env does not exist (and no --environ or --file)');
                    }
                    else {
                        throw err;
                    }
                }
            }
            var prj = env
                ? new XProject(this, env, base)
                : new DummyProject(this, path, base);
            prj.load(params, force);
            return prj;
        }
        config(name) {
            throw err.abstractFun('Platform.config');
        }
        configs() {
            throw err.abstractFun('Platform.configs');
        }
        cwd() {
            throw err.abstractFun('Platform.cwd');
        }
        mkdir(path, force) {
            throw err.abstractFun('Platform.mkdir');
        }
        debug(msg) {
            throw err.abstractFun('Platform.debug');
        }
        log(msg) {
            throw err.abstractFun('Platform.log');
        }
        info(msg) {
            throw err.abstractFun('Platform.info');
        }
        warn(msg) {
            throw err.abstractFun('Platform.warn');
        }
        resolve(href, base) {
            throw err.abstractFun('Platform.resolve');
        }
        dirname(href) {
            var steps = href.replace(/\\/g, '/').split('/');
            steps.pop();
            return steps.join('/') + '/';
        }
        read(path) {
            throw err.abstractFun('Platform.read');
        }
        // validate a few rules for all JSON files, return the mlproj sub-object
        validateJson(json) {
            var proj = json.mlproj;
            if ( ! proj ) {
                throw new Error('Invalid file, must have the root `mlproj`');
            }
            if ( Object.keys(json).length !== 1 ) {
                throw new Error('Invalid file, must have only one root');
            }
            if ( ! proj.format ) {
                throw new Error('Invalid file, must have the property `format`');
            }
            if ( proj.format !== '0.1' ) {
                throw new Error('Invalid file, `format` not 0.1: ' + proj.format);
            }
            return proj;
        }
        json(path, validate) {
            var json = JSON.parse(this.read(path));
            if ( validate ) {
                return this.validateJson(json);
            }
            return json;
        }
        projectXml(path) {
            throw err.abstractFun('Platform.projectXml');
        }
        write(path, content, force) {
            throw err.abstractFun('Platform.write');
        }
        green(s) {
            throw err.abstractFun('Platform.green');
        }
        yellow(s) {
            throw err.abstractFun('Platform.yellow');
        }
        red(s) {
            throw err.abstractFun('Platform.red');
        }
        bold(s) {
            throw err.abstractFun('Platform.bold');
        }
        url(api, url) {
            if ( ! this.space ) {
                throw new Error('No space set on the platform for host');
            }
            var host = this.space.param('@host');
            if ( ! host ) {
                throw new Error('No host in space');
            }
            var decl   = this.space.api(api);
            var scheme = decl.ssl ? 'https' : 'http';
            var root   = decl.root.length ? '/' + decl.root : decl.root;
            return scheme + '://' + host + ':' + decl.port + root + url;
        }
        get(api, url, error, success) {
            throw err.abstractFun('Platform.get');
        }
        post(api, url, data, error, success) {
            throw err.abstractFun('Platform.post');
        }
        put(api, url, data, error, success) {
            throw err.abstractFun('Platform.put');
        }
        restart(last) {
            throw err.abstractFun('Platform.restart');
        }
        isDirectory(path) {
            throw err.abstractFun('Platform.isDirectory');
        }
        dirChildren(path) {
            throw err.abstractFun('Platform.dirChildren');
        }
        // return an array of strings, with the path of all files in the dir
        // if filter is passed, it must return true for a path to be returned
        // ignored is called for each seuch ingnored path
        // both take file path, then dir as parameters
        allFiles(dir, filter, ignored) {
            // extract the basename of the dir path in `p`
            const basename = p => {
                var idx = p.lastIndexOf('/');
                // no slash
                if ( idx < 0 ) {
                    return p;
                }
                // slash at the end
                else if ( idx + 1 === p.length ) {
                    var pen = p.lastIndexOf('/', idx - 1);
                    // no other slash
                    if ( pen < 0 ) {
                        return p.slice(0, idx);
                    }
                    // take name between both slashes
                    else {
                        return p.slice(pen + 1, idx);
                    }
                }
                // slash somewhere else
                else {
                    return p.slice(idx + 1);
                }
            };

            // recursive implementation
            const impl = (dir, list) => {
                this.dirChildren(dir).forEach(file => {
                    if ( ! filter || filter(file, dir) ) {
                        list.push(file);
                        if ( file.files ) {
                            impl(file.path, file.files);
                        }
                    }
                    else if ( ignored ) {
                        ignored(file, dir);
                    }
                });
            };

            // only for a directory
            if ( ! this.isDirectory(dir) ) {
                throw new Error('Can only list files of a directory: ' + dir);
            }

            // set the top-level infos, and call recursive implementation
            var files = {
                files: [],
                path : dir,
                name : basename(dir)
            };
            impl(dir, files.files);

            // flaten the list
            const flaten = (dir, list) => {
                dir.files.forEach(f => {
                    if ( f.files ) {
                        flaten(f, res);
                    }
                    else {
                        res.push(f.path);
                    }
                });
            };
            var res = [];
            flaten(files, res);

            return res;
        }
    }

    /*~
     * Utility interface to abstract a display.
     *
     * In order to accomodate different sorts of displays, like terminal or
     * web-based, it does not provide low-level routines (e.g. "print line") but
     * rather high-level display functions (e.g. "display a server description",
     * or "display action progress info").
     */
    class Display
    {
        database(name, id, schema, security, triggers, forests, props) {
            throw err.abstractFun('Display.database');
        }
        server(name, id, group, content, modules, props) {
            throw err.abstractFun('Display.server');
        }
        source(name) {
            throw err.abstractFun('Display.source');
        }
        project(code, configs, title, name, version) {
            throw err.abstractFun('Display.project');
        }
        environ(envipath, title, desc, host, user, password, mods, params, imports) {
            throw err.abstractFun('Display.environ');
        }
        check(indent, msg, arg) {
            throw err.abstractFun('Display.check');
        }
        add(indent, verb, msg, arg) {
            throw err.abstractFun('Display.add');
        }
        remove(indent, verb, msg, arg) {
            throw err.abstractFun('Display.remove');
        }
        error(e, verbose) {
            throw err.abstractFun('Display.error');
        }
    }

    /*~
     * A base, abstract project.
     */
    class Project
    {
        constructor(platform, path, proj) {
            this.platform = platform;
            this.path     = path;
            this.proj     = proj;
        }

        load(params, force, defaults) {
            this.space = Space.load(this.platform, this.path, params, force, defaults);
            this.platform.space = this.space;
            [ 'host', 'user', 'password' ].forEach(name => {
                var val = this.space.param('@' + name);
                if ( ! val ) {
                    if ( this.proj && this.proj.connect && this.proj.connect[name] ) {
                        this.space.param('@' + name, this.proj.connect[name]);
                    }
                    else if ( this.platform._connect && this.platform._connect[name] ) {
                        this.space.param('@' + name, this.platform._connect[name]);
                    }
                }
            });
        }

        // Precedence:
        // - space's config if exists
        // - if not project's config if exists
        // - if not global config if exists
        config(name)
        {
            var v = this.space.config(name);
            if ( v !== undefined ) {
                return v;
            }
            if ( this.proj && this.proj.config ) {
                v = this.proj.config[name];
                if ( v !== undefined ) {
                    return v;
                }
            }
            return this.platform.config(name);
        }

        configs()
        {
            var names = this.space.configs();
            if ( this.proj && this.proj.config ) {
                names = names.concat(
                    Object.keys(this.proj.config).filter(n => ! names.includes(n)));
            }
            names = names.concat(
                this.platform.configs().filter(n => ! names.includes(n)));
            return names;
        }
    }

    /*~
     * A project based on XProject, with the root dir being `base`.
     */
    class XProject extends Project
    {
        constructor(platform, env, base) {
            if ( ! /^[-_.0-9a-zA-Z]+$/.test(env) ) {
                throw new Error('Invalid environment name: ' + env);
            }
            var path = platform.resolve('xproject/mlenvs/' + env + '.json', base);
            var proj = XProject.projectFile(platform, base);
            super(platform, path, proj);
            this.environ = env;
            this.base    = base;
        }

        load(params, force) {
            var path = this.platform.resolve('xproject/project.xml', this.base);
            var p    = this.platform.projectXml(path);
            this.name    = p.name;
            this.abbrev  = p.abbrev;
            this.version = p.version;
            this.title   = p.title;
            super.load(params, force, { code: this.abbrev });
        }

        show(display) {
            const configs = this.configs().map(c => {
                return { name: c, value: this.config(c) };
            });
            display.project(this.space.param('@code'), configs,
                            this.title, this.name, this.version);
        }
    }

    XProject.projectFile = (pf, base) => {
        var path = pf.resolve('xproject/mlproj.json', base);
        try {
            return pf.json(path, true);
        }
        catch (err) {
            // file does not exist, ignore
            if ( err.name !== 'no-such-file' ) {
                throw err;
            }
        }
    }

    /*~
     * Not a real project, just a placeholder for the environment.
     */
    class DummyProject extends Project
    {
        constructor(platform, path, base) {
            super(platform, platform.resolve(path, base));
        }

        load(params, force) {
            super.load(params, force, {});
        }

        show(display) {
            const configs = this.configs().map(c => {
                return { name: c, value: this.config(c) };
            });
            display.project(this.space.param('@code'), configs);
        }
    }

    /*~
     * One space, with its dependencies.
     */
    class Space
    {
        constructor(json, base, platform)
        {
            var that = this;
            this._params    = json.params    || {};
            this._apis      = json.apis      || {};
            this._databases = json.databases || [];
            this._servers   = json.servers   || [];
            this._sources   = json.sources   || [];
            this._imports   = [];
            this._config    = json.config;
            // extract defined values from `obj` and put them in `this.param`
            var extract = function(obj, props) {
                props.forEach(p => {
                    var v = obj[p];
                    if ( v !== undefined ) {
                        that.param('@' + p,  v);
                    }
                });
            };
            extract(json, ['code', 'title', 'desc']);
            if ( json.connect ) {
                extract(json.connect, ['host', 'user', 'password']);
            }
        }

        addImport(href, space)
        {
            this._imports.push({
                href  : href,
                space : space
            });
        }

        show(display, envipath)
        {
            const addImports = (space, level) => {
                space._imports.forEach(i => {
                    imports.push({ level: level, href: i.href });
                    addImports(i.space, level + 1);
                });
            };
            const imports = [];
            addImports(this, 1);
            var mods;
            try {
                mods = this.modulesDb().name;
            }
            catch (e) {
                if ( /no server/i.test(e.message) ) {
                    // nothing
                }
                else if ( /more than 1/i.test(e.message) ) {
                    mods = '(more than 1 server)';
                }
                else if ( /no modules/i.test(e.message) ) {
                    mods = '(filesystem)';
                }
                else {
                    throw e;
                }
            }
            display.environ(
                envipath,
                this.param('@title'),
                this.param('@desc'),
                this.param('@host'),
                this.param('@user'),
                this.param('@password'),
                mods,
                this.params().map(p => {
                    return { name: p, value: this.param(p) };
                }),
                imports);
        }

        api(name)
        {
            // "flatten" the import graph in a single array
            // most priority at index 0, least priority at the end
            var imports = [];
            var flatten = space => {
                if ( ! imports.includes(space) ) {
                    imports.push(space);
                    space._imports.forEach(i => flatten(i.space));
                }
            };
            flatten(this);

            // the current value, at any time of walking the import graph
            var current;

            // the default value for `current`
            if ( name === 'management' ) {
                current = {
                    root : 'manage/v2',
                    port : 8002,
                    ssl  : false
                };
            }
            else if ( name === 'admin' ) {
                current = {
                    root : 'admin/v1',
                    port : 8001,
                    ssl  : false
                };
            }
            else if ( name === 'client' ) {
                current = {
                    root : 'v1',
                    port : 8000,
                    ssl  : false
                };
            }
            else if ( name === 'xdbc' ) {
                current = {
                    root : '',
                    port : 8000,
                    ssl  : false
                };
            }
            else {
                throw new Error('Unknown API: ' + name);
            }

            // overrides lhs props with those in rhs, if any
            var collapse = (lhs, rhs) => {
                if ( rhs ) {
                    Object.keys(rhs).forEach(k => lhs[k] = rhs[k]);
                }
            };

            // walk the flatten import graph
            while ( imports.length ) {
                collapse(current, imports.pop()._apis[name]);
            }

            return current;
        }

        param(name, value)
        {
            if ( value === undefined ) {
                var v = this._params[name];
                if ( name !== '@title' && name !== '@desc' ) {
                    var i = this._imports.length;
                    while ( v === undefined && i > 0 ) {
                        v = this._imports[--i].space.param(name);
                    }
                }
                return v;
            }
            else {
                this._params[name] = value;
            }
        }

        params()
        {
            var names = Object.keys(this._params).filter(n => n.slice(0, 1) !== '@');
            for ( var i = this._imports.length - 1; i >= 0; --i ) {
                var imported = this._imports[i].space.params();
                names = names.concat(imported.filter(n => ! names.includes(n)));
            }
            return names;
        }

        config(name)
        {
            var v = this._config && this._config[name];
            var i = this._imports.length;
            while ( v === undefined && i > 0 ) {
                v = this._imports[--i].space.config(name);
            }
            return v;
        }

        configs()
        {
            var names = this._config ? Object.keys(this._config) : [];
            for ( var i = this._imports.length - 1; i >= 0; --i ) {
                var imported = this._imports[i].space.configs();
                names = names.concat(imported.filter(n => ! names.includes(n)));
            }
            return names;
        }

        sources()
        {
            return this._allSrcs;
        }

        source(name)
        {
            let res = this.sources().filter(src => src.name === name);
            if ( ! res.length ) {
                return;
            }
            else if ( res.length === 1 ) {
                return res[0];
            }
            else {
                let list = res.map(src => src.name).join(', ');
                throw new Error('More than one source with name "' + name + '": ' + list);
            }
        }

        databases()
        {
            return this._allDbs;
        }

        // ref is either ID or name
        database(ref)
        {
            let res = this.databases().filter(db => db.id === ref || db.name === ref);
            if ( ! res.length ) {
                return;
            }
            else if ( res.length === 1 ) {
                return res[0];
            }
            else {
                let list = res.map(db => 'id:' + db.id + '/name:' + db.name).join(', ');
                throw new Error('More than one DB with ID or name "' + ref + '": ' + list);
            }
        }

        servers()
        {
            return this._allSrvs;
        }

        modulesDb()
        {
            return this._getDb('modules');
        }

        contentDb()
        {
            return this._getDb('content');
        }

        _getDb(which)
        {
            var srvs = this.servers();
            if ( ! srvs.length ) {
                throw new Error('No server in the environment');
            }
            else if ( srvs.length > 1 ) {
                throw new Error('More than 1 server in the environment');
            }
            var srv = srvs[0];
            var res = srv[which];
            if ( ! res ) {
                throw new Error('Server has no ' + which + ' database: ' + srv.name);
            }
            return res;
        }

        // cache databases and servers (resolving import priority)
        cache(platform)
        {
            // merge database and server JSON objects
            var ctxt = {
                href     : "@root",
                dbs      : [],
                dbIds    : {},
                dbNames  : {},
                srvs     : [],
                srvIds   : {},
                srvNames : {},
                srcs     : [],
                srcNames : {}
            };
            this.cacheImpl(ctxt, platform);

            // build the array of database and server objects
            // the order of the database array guarantees there is no broken dependency
            var res = {
                list  : [],
                ids   : {},
                names : {}
            };

            // instantiate a database object from its JSON object, and resolve
            // its schema, security and triggers database if any to objects
            // already instantiated
            var instantiate = (json, res) => {
                // is it a system db name?
                if ( json.sysref ) {
                    var db = new cmp.SysDatabase(json.sysref);
                    res.list.push(db);
                    res.names[json.sysref] = db;
                    return db;
                }
                // resolve a schema, security or triggers DB from the current result list
                var resolve = db => {
                    if ( ! db ) {
                        return;
                    }
                    var end = ( db.name    && res.names[db.name]    )
                        ||    ( db.nameref && res.names[db.nameref] )
                        ||    ( db.id      && res.ids[db.id]        )
                        ||    ( db.idref   && res.ids[db.idref]     )
                        ||    ( db.sysref  && res.names[db.sysref]  );
                    if ( end ) {
                        return end;
                    }
                    // is it self-referencing by ID?
                    if ( db.idref && db.idref === json.id ) {
                        return 'self';
                    }
                    // is it self-referencing by name?
                    if ( db.nameref && db.nameref === json.name ) {
                        return 'self';
                    }
                    // is it a system db name?
                    if ( db.sysref ) {
                        return res.names[db.sysref] = new cmp.SysDatabase(db.sysref);
                    }
                };
                var schema   = resolve(json.schema);
                var security = resolve(json.security);
                var triggers = resolve(json.triggers)
                var db       = new cmp.Database(json, schema, security, triggers);
                res.list.push(db);
                if ( json.id ) {
                    res.ids[json.id] = db;
                }
                if ( json.name ) {
                    res.names[json.name] = db;
                }
                return db;
            };

            // return true if a database does not need instantiation anymore (if
            // it is already instantiated or if it is undefined)
            var done = (db, res) => {
                if ( ! db ) {
                    // no dependency
                    return true;
                }
                else if ( db.id && res.ids[db.id] ) {
                    // has an ID and has been done
                    return true;
                }
                else if ( db.name && res.names[db.name] ) {
                    // has a name and has been done
                    return true;
                }
                else if ( db.idref && res.ids[db.idref] ) {
                    // is a reference to an ID that has been done
                    return true;
                }
                else if ( db.nameref && res.names[db.nameref] ) {
                    // is a reference to a name that has been done
                    return true;
                }
                else if ( db.sysref && res.names[db.sysref] ) {
                    // is a reference to a name that has been done
                    return true;
                }
                else {
                    return false;
                }
            };

            // return true if `child` references its `parent`
            var selfRef = (parent, child) => {
                if ( ! child ) {
                    return false;
                }
                else if ( parent.id && parent.id === child.idref ) {
                    return true;
                }
                else if ( parent.name && parent.name === child.nameref ) {
                    return true;
                }
                else {
                    return false;
                }
            };

            // return true if `db` is a reference to another DB (by ID or name)
            var isRef = db => {
                if ( ! db ) {
                    return false;
                }
                else if ( db.idref || db.nameref || db.sysref ) {
                    return true;
                }
                else {
                    return false;
                }
            };

            // starting at one DB (a "standalone" DB or a server's content or
            // modules DB), return all the DB (itself or embedded, at any level)
            // that can be instantiated (meaning: with all referrenced schema,
            // security and triggers DB already instantiated, with the exception
            // of self-referrencing DB which can be instantiated as well)
            var candidates = (db, res) => {
                if ( done(db, res) ) {
                    // if already instantiated, do nothing
                    return [];
                }
                else if ( isRef(db) ) {
                    // if the referrenced DB is instantiated, then return it
                    if ( db.idref && res.ids[db.idref] ) {
                        return [ db ];
                    }
                    else if ( db.nameref && res.names[db.nameref] ) {
                        return [ db ];
                    }
                    else if ( db.sysref ) {
                        return [ db ];
                    }
                    else {
                        return [];
                    }
                }
                else {
                    // if both referrenced DB are instantiated, or self-refs, then return it
                    var sch = selfRef(db, db.schema)   || done(db.schema, res);
                    var sec = selfRef(db, db.security) || done(db.security, res);
                    var trg = selfRef(db, db.triggers) || done(db.triggers, res);
                    if ( sch && sec && trg ) {
                        return [ db ];
                    }
                    // if not, recurse
                    else {
                        return candidates(db.schema, res)
                            .concat(candidates(db.security, res))
                            .concat(candidates(db.triggers, res));
                    }
                }
            }

            // return all candidates (like `candidate`, but using all "roots")
            var allCandidates = (ctxt, res) => {
                var all = [];
                ctxt.dbs.forEach(db => {
                    all = all.concat(candidates(db, res));
                });
                ctxt.srvs.forEach(srv => {
                    all = all.concat(candidates(srv.content, res));
                    all = all.concat(candidates(srv.modules, res));
                });
                return all;
            }

            // return all databases and servers for which there is some unmet dependency
            var unsolved = (ctxt, res) => {
                var impl = (db) => {
                    if ( done(db, res) ) {
                        return [];
                    }
                    else {
                        return [ db ]
                            .concat(impl(db.schema))
                            .concat(impl(db.security))
                            .concat(impl(db.triggers));
                    }
                };
                var all  = [];
                var srvs = [];
                ctxt.dbs.forEach(db => {
                    all = all.concat(impl(db));
                });
                ctxt.srvs.forEach(srv => {
                    var lhs = impl(srv.content);
                    var rhs = impl(srv.modules);
                    if ( lhs.length || rhs.length ) {
                        srvs.push(srv);
                    }
                    all = all.concat(lhs).concat(rhs);
                });
                return all.concat(srvs);
            }

            // as long as we find candidates, instantiate them
            var cands;
            while ( ( cands = allCandidates(ctxt, res) ).length ) {
                cands.forEach(db => instantiate(db, res));
            }
            this._allDbs = res.list;

            // ensure we have instantiated all databases
            var leftover = unsolved(ctxt, res);
            if ( leftover.length ) {
                var disp = leftover.map(c => {
                    if ( c.content || c.modules ) {
                        return '{srv ' + (c.name || '') + '}';
                    }
                    else if ( c.id || c.name ) {
                        return '{db ' + (c.id || '') + '|' + (c.name || '') + '}';
                    }
                    else {
                        return '{dbref ' + (c.idref || '') + '|' + (c.nameref || '') + '|' + (c.sysref || '') + '}';
                    }
                });
                throw new Error('Some components have unsolved database dependencies: ' + disp);
            }

            // instantiate all servers now
            this._allSrvs = ctxt.srvs.map(srv => {
                var resolve = db => {
                    if ( ! db ) {
                        return;
                    }
                    var cmp = ( db.name    && res.names[db.name]    )
                           || ( db.nameref && res.names[db.nameref] )
                           || ( db.id      && res.ids[db.id]        )
                           || ( db.idref   && res.ids[db.idref]     )
                           || ( db.sysref  && res.names[db.sysref]  );
                    if ( cmp ) {
                        return cmp;
                    }
                    if ( db.sysref ) {
                        return res.names[db.sysref] = new cmp.SysDatabase(db.sysref);
                    }
                };
                return new cmp.Server(srv, this, resolve(srv.content), resolve(srv.modules));
            });

            // instantiate all sources now
            let dfltSrc = ctxt.srcs.find(s => s.name === '@default');
            let dflt    = dfltSrc && new cmp.SourceSet(dfltSrc);
            this._allSrcs = ctxt.srcs.filter(s => s.name !== '@default').map(s => {
                return new cmp.SourceSet(s, dflt);
            });
        }

        // recursive implementation of cache(), caching databases and servers
        cacheImpl(ctxt, platform)
        {
            // small helper to format info and error messages
            var _ = (c) => {
                return 'id=' + c.id + '|name=' + c.name;
            };

            // the common implementation for databases and servers
            var impl = (comp, cache, ids, names, kind) => {
                // at least one of ID and name mandatory
                if ( ! comp.name && ! comp.id ) {
                    throw new Error('No ID and no name on ' + kind + ' in ' + ctxt.href);
                }
                // default value for compose
                if ( ! comp.compose ) {
                    comp.compose = 'merge';
                }
                // does it exist yet?
                var derived =
                    ( comp.id && ids[comp.id] )
                    || ( comp.name && names[comp.name] );
                // if it does, perform the "compose" action..
                if ( derived ) {
                    if ( derived.compose !== comp.compose ) {
                        throw new Error('Different compose actions for ' + kind + 's: derived:'
                                        + _(derived) + '|compose=' + derived.compose + ' and base:'
                                        + _(comp) + '|compose=' + comp.compose);
                    }
                    else if ( derived.compose === 'merge' ) {
                        platform.info('Merge ' + kind + 's derived:' + _(derived) + ' and base:' + _(comp));
                        var overriden = Object.keys(derived);
                        for ( var p in comp ) {
                            if ( overriden.indexOf(p) === -1 ) {
                                derived[p] = comp[p];
                                if ( p === 'id' ) {
                                    ids[derived.id] = derived;
                                }
                                else if ( p === 'name' ) {
                                    names[derived.name] = derived;
                                }
                            }
                        }
                    }
                    else if ( derived.compose === 'hide' ) {
                        platform.info('Hide ' + kind + ' base:' + _(comp) + ' by derived:' + _(derived));
                    }
                    else {
                        throw new Error('Unknown compose on ' + kind + ': ' + _(derived) + '|compose=' + derived.compose);
                    }
                }
                // ...if it does not, just add it
                else {
                    cache.push(comp);
                    if ( comp.id ) {
                        ids[comp.id] = comp;
                    }
                    if ( comp.name ) {
                        names[comp.name] = comp;
                    }
                }
            };

            // cache databases
            this._databases.forEach(db => {
                impl(db, ctxt.dbs, ctxt.dbIds, ctxt.dbNames, 'database');
            });
            // cache servers
            this._servers.forEach(srv => {
                impl(srv, ctxt.srvs, ctxt.srvIds, ctxt.srvNames, 'server');
            });
            // cache sources
            this._sources.forEach(src => {
                impl(src, ctxt.srcs, null, ctxt.srcNames, 'source');
            });
            // recurse on imports
            this._imports.forEach((i) => {
                ctxt.href = i.href;
                i.space.cacheImpl(ctxt, platform);
            });
        }

        resolve(root)
        {
            this.root = root;
            this.resolveObject(this._params, true);
            this.resolveArray(this._databases);
            this.resolveArray(this._servers);
            this.resolveArray(this._sources);
            this._imports.forEach(i => i.space.resolve(root));
        }

        resolveThing(val, forbiden)
        {
            if ( typeof val === 'string' ) {
                return this.resolveString(val, forbiden);
            }
            else if ( val instanceof Array ) {
                return this.resolveArray(val);
            }
            else if ( val instanceof Object ) {
                return this.resolveObject(val);
            }
            else {
                return val;
            }
        }

        resolveArray(array)
        {
            if ( ! array instanceof Array ) {
                throw new Error('Value not an array: ' + JSON.stringify(array));
            }
            for ( var i = 0; i < array.length; ++i ) {
                array[i] = this.resolveThing(array[i]);
            }
            return array;
        }

        resolveObject(obj, forbid)
        {
            if ( ! obj instanceof Object ) {
                throw new Error('Value not an object: ' + JSON.stringify(obj));
            }
            for ( var p in obj ) {
                obj[p] = this.resolveThing(obj[p], forbid ? p : undefined);
            }
            return obj;
        }

        resolveString(val, forbiden)
        {
            if ( ! val instanceof String ) {
                throw new Error('Value not a string: ' + JSON.stringify(val));
            }
            val = this.resolveVars(val, forbiden, '@', '@');
            val = this.resolveVars(val, forbiden, '$', '');
            return val;
        }

        resolveVars(str, forbiden, ch, prefix)
        {
            var at = str.indexOf(ch + '{');
            // no more to escape
            if ( at < 0 ) {
                return str;
            }
            // first "}" after the @{ or ${
            var close = str.indexOf('}', at);
            // invalid ref
            if ( close < 0 ) {
                throw new Error('Invalid ' + ch + ' reference, } is missing: ' + str);
            }
            var name = str.slice(at + 2, close);
            // cannot use a param in its own value
            if ( name === forbiden ) {
                throw new Error('Invalid ' + ch + ' reference, value references itself: ' + name);
            }
            // name must be alphanumeric, with "-" separator
            if ( name.search(/^[a-zA-Z0-9]+(-[a-zA-Z0-9]+)*$/) < 0 ) {
                throw new Error('Invalid ' + ch + ' reference, invalid name: ' + name);
            }
            var val = this.root.param(prefix + name);
            if ( ! val ) {
                throw new Error('No value for parameter: ' + name);
            }
            var resolved = str.slice(0, at) + val + str.slice(close + 1);
            return this.resolveVars(resolved, forbiden);
        }

        static load(platform, href, params, force, defaults)
        {
            // recursive implementation
            var impl = (href, base) => {
                var path    = base ? platform.resolve(href, base) : href;
                var proj    = platform.json(path, true);
                var newBase = platform.dirname(path);
                var space   = new Space(proj, newBase, platform);
                var imports = proj['import'];
                if ( typeof imports === 'string' ) {
                    imports = [ imports ];
                }
                if ( imports ) {
                    imports.forEach((i) => {
                        // TODO: Should resolve properly against resolved `href`...
                        var s = impl(i, newBase);
                        space.addImport(i, s);
                    });
                }
                return space;
            };
            // start with root
            var root = impl(href);
            // if not set explicitly, use default values
            Object.keys(defaults).forEach(name => {
                if ( root.param('@' + name) === undefined ) {
                    root.param('@' + name, defaults[name]);
                }
            });
            // override values from `force`
            Object.keys(force).forEach(name => {
                root.param('@' + name, force[name]);
            });
            // override values from `params`
            Object.keys(params).forEach(name => root.param(name, params[name]));
            // resolve the param references
            root.resolve(root);
            // resolve import priority and cache databses and servers
            root.cache(platform);
            // return the loaded root (with imported spaces)
            return root;
        }
    }

    module.exports = {
        Platform : Platform,
        Display  : Display,
        Space    : Space
    };
}
)();
