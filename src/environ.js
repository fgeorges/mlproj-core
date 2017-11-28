"use strict";

(function() {

    const err = require('./error');
    const cmp = require('./components');

    /*~
     * A complete environment.
     */
    class Environ
    {
        constructor(ctxt, json, path, proj)
        {
            this._params = {};
            this.ctxt    = ctxt;
            this.proj    = proj;
            this.module  = new Module(ctxt, json, path);
            this.module.loadImports(ctxt);
            // needed for connect infos, find a nicer way to pass them
            if ( ctxt.platform.environ ) {
                throw new Error('Environ already set on the context');
            }
            ctxt.platform.environ = this;
        }

        static fromName(ctxt, name, base, proj) {
            let json;
            let path;
            if ( name.includes('/') ) {
                path = ctxt.platform.resolve('xproject/mlenvs/@' + name.replace('/', '+'), base);
                json = { "mlproj": {
                    "format": '0.1',
                    "import": name.split('/').map(n => {
                        let pjson = ctxt.platform.resolve(n + '.json', 'xproject/mlenvs');
                        let pjs   = ctxt.platform.resolve(n + '.js',   'xproject/mlenvs');
                        // return .js only if .json does not exist and .js does exist
                        return (! ctxt.platform.exists(pjson) && ctxt.platform.exists(pjs))
                            ? n + '.js'
                            : n + '.json';
                    })
                }};
            }
            else {
                let pjson = ctxt.platform.resolve('xproject/mlenvs/' + name + '.json', base);
                let pjs   = ctxt.platform.resolve('xproject/mlenvs/' + name + '.js',   base);
                // use .js only if .json does not exist and .js does exist
                if ( ! ctxt.platform.exists(pjson) && ctxt.platform.exists(pjs) ) {
                    path = pjs;
                    json = require(path)();
                }
                else {
                    path = pjson;
                    json = ctxt.platform.json(path);
                }
            }
            let env = new Environ(ctxt, json, path, proj);
            env.name = name;
            return env;
        }

        configs() {
            var names = this.module.configs();
            return names.concat(
                this.proj.configs().filter(n => ! names.includes(n)));
        }

        // Precedence:
        // - modules's config if exists
        // - if not project's config if exists
        // - if not global config if exists
        config(name) {
            var v = this.module.config(name);
            return v !== undefined
                ? v
                : this.proj.config(name);
        }

        params() {
            var names = Object.keys(this._params).filter(n => ! n.startsWith('@'));
            this.module.params()
                .filter(n => ! names.includes(n))
                .forEach(n => names.push(n));
            return names;
        }

        param(name, value) {
            if ( value === undefined ) {
                var v = this._params[name];
                return v === undefined
                    ? this.module.param(name)
                    : v;
            }
            else {
                this._params[name] = value;
            }
        }

        commands() {
            return this.module.commands();
        }

        // TODO: Define the exact type/structure of the command values:
        //
        // - function
        // - string/array of strings
        // - object with different properties
        //
        // Then should we do some normalization here?  Or let the caller do it?
        //
        command(name) {
            return this.module.command(name);
        }

        api(name) {
            let res = this._apis[name];
            if ( ! res ) {
                throw new Error('Unknown API: ' + name);
            }
            return res;
        }

        hosts() {
            return this._hosts;
        }

        databases() {
            return this._databases;
        }

        // ref is either ID or name
        database(ref) {
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

        servers() {
            return this._servers;
        }

        // ref is either ID or name
        server(ref) {
            let res = this.servers().filter(srv => srv.id === ref || srv.name === ref);
            if ( ! res.length ) {
                return;
            }
            else if ( res.length === 1 ) {
                return res[0];
            }
            else {
                let list = res.map(srv => 'id:' + srv.id + '/name:' + srv.name).join(', ');
                throw new Error('More than one server with ID or name "' + ref + '": ' + list);
            }
        }

        mimetypes() {
            return this._mimetypes;
        }

        roles() {
            return this._roles;
        }

        users() {
            return this._users;
        }

        sources() {
            return this._sources;
        }

        source(name) {
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

        substitute(val) {
            return this.module.resolveThing(this, val);
        }

        compile(params, force, defaults) {
            // if not set explicitly, use default values
            if ( defaults ) {
                Object.keys(defaults).forEach(name => {
                    if ( this.param('@' + name) === undefined ) {
                        this.param('@' + name, defaults[name]);
                    }
                });
            }
            // override values from `force`
            if ( force ) {
                Object.keys(force).forEach(name => {
                    this.param('@' + name, force[name]);
                });
            }
            // override values from `params`
            if ( params ) {
                Object.keys(params).forEach(name => {
                    this.param(name, params[name]);
                });
            }
            // compile databses, servers, source sets, mime types, roles, users and
            // apis (with import priority)
            this.module.compile(this);
        }

        show() {
            const addImports = (m, level) => {
                m.imports.forEach(i => {
                    imports.push({ level: level, href: i.path });
                    addImports(i, level + 1);
                });
            };
            const imports = [];
            addImports(this.module, 1);
            let apis = {};
            ['manage', 'admin', 'client', 'xdbc'].forEach(a => {
                let api = this._overridenApis[a];
                if ( Object.keys(api).length ) {
                    apis[a] = api;
                }
            });
            this.ctxt.display.environ(
                this.name || this.module.path,
                this.param('@title'),
                this.param('@desc'),
                this.param('@host'),
                this.param('@user'),
                this.param('@password'),
                this.params().map(p => {
                    return { name: p, value: this.param(p) };
                }),
                apis,
                this.commands(),
                imports);
        }
    }

    /*~
     * An environment module, that is a single one environment file.
     *
     * TODO: FIXME: The method `resolve()` modifies the JSON in place.  It
     * should not.  It would be nice to be able to keep it, so it is possible to
     * serialize it back (preserving variable references, for instance).
     */
    class Module
    {
        constructor(ctxt, json, path) {
            this.ctxt = ctxt;
            // TODO: Resolve...?
            this.path = path;
            if ( Object.keys(json).length !== 1 ) {
                // TODO: Use proper e.* errors...
                throw new Error('Invalid file, must have exactly one root');
            }
            this.json = json.mlproj;
            if ( ! this.json ) {
                throw new Error('Invalid file, must have the root `mlproj`');
            }
            if ( ! this.json.format ) {
                throw new Error('Invalid file, must have the property `format`');
            }
            if ( this.json.format !== '0.1' ) {
                throw new Error('Invalid file, `format` not 0.1: ' + this.json.format);
            }

            // the params and commands hashes, empty by default
            this._params   = this.json.params   || {};
            this._commands = this.json.commands || {};
            // extract defined values from `obj` and put them in `this._params`
            var extract = (obj, props) => {
                props.forEach(p => {
                    var v = obj[p];
                    if ( v !== undefined ) {
                        this.param('@' + p,  v);
                    }
                });
            };
            extract(this.json, ['code', 'title', 'desc']);
            if ( this.json.connect ) {
                extract(this.json.connect, ['host', 'user', 'password']);
            }
        }

        loadImports() {
            this.imports = [];
            var imports = this.json['import'];
            if ( imports ) {
                if ( ! Array.isArray(imports) ) {
                    imports = [ imports ];
                }
                imports.forEach(i => {
                    let b = this.ctxt.platform.dirname(this.path);
                    let p = this.ctxt.platform.resolve(i, b);
                    // TODO: Catch errors from require() and json() to display a
                    // proper message (esp. with the correct path to the file...)
                    let j = p.endsWith('.js')
                        ? require(p)()
                        : this.ctxt.platform.json(p);
                    let m = new Module(this.ctxt, j, p);
                    this.imports.push(m);
                    m.loadImports(this.ctxt);
                });
            }
        }

        source(name) {
            let res = this._sources.filter(src => src.name === name);
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

        configs() {
            let names = this.json.config ? Object.keys(this.json.config) : [];
            for ( let i = this.imports.length - 1; i >= 0; --i ) {
                this.imports[i].configs()
                    .filter(n => ! names.includes(n))
                    .forEach(n => names.push(n));
            }
            return names;
        }

        config(name) {
            let v = this.json.config && this.json.config[name];
            for ( let i = this.imports.length - 1; v === undefined && i >= 0; --i ) {
                v = this.imports[i].config(name);
            }
            return v;
        }

        params() {
            var names = Object.keys(this._params).filter(n => ! n.startsWith('@'));
            this.imports.forEach(i => {
                i.params()
                    .filter(n => ! names.includes(n))
                    .forEach(n => names.push(n));
            });
            return names;
        }

        param(name, value) {
            if ( value === undefined ) {
                var v = this._params[name];
                if ( name !== '@title' && name !== '@desc' ) {
                    for ( let i = this.imports.length - 1; v === undefined && i >= 0; --i ) {
                        v = this.imports[i].param(name);
                    }
                }
                return v;
            }
            else {
                this._params[name] = value;
            }
        }

        commands() {
            var names = Object.keys(this._commands);
            this.imports.forEach(i => {
                i.commands()
                    .filter(n => ! names.includes(n))
                    .forEach(n => names.push(n));
            });
            return names;
        }

        command(name) {
            var cmd = this._commands[name];
            for ( let i = this.imports.length - 1; cmd === undefined && i >= 0; --i ) {
                cmd = this.imports[i].command(name);
            }
            return cmd;
        }

        // `root` can be the root module, or the environ itself
        //
        resolve(root) {
            this.resolveObject(root, this.json.params, true);
            this.resolveArray(root, this.json.databases);
            this.resolveArray(root, this.json.servers);
            this.resolveArray(root, this.json.sources);
            this.imports.forEach(i => i.resolve(root));
        }

        resolveThing(root, val, forbiden) {
            if ( typeof val === 'string' ) {
                return this.resolveString(root, val, forbiden);
            }
            else if ( val instanceof Array ) {
                return this.resolveArray(root, val);
            }
            else if ( val instanceof Object ) {
                return this.resolveObject(root, val);
            }
            else {
                return val;
            }
        }

        resolveArray(root, array) {
            if ( ! array ) {
                return;
            }
            if ( ! array instanceof Array ) {
                throw new Error('Value not an array: ' + JSON.stringify(array));
            }
            for ( var i = 0; i < array.length; ++i ) {
                array[i] = this.resolveThing(root, array[i]);
            }
            return array;
        }

        resolveObject(root, obj, forbid) {
            if ( ! obj ) {
                return;
            }
            if ( ! obj instanceof Object ) {
                throw new Error('Value not an object: ' + JSON.stringify(obj));
            }
            for ( var p in obj ) {
                obj[p] = this.resolveThing(root, obj[p], forbid ? p : undefined);
            }
            return obj;
        }

        resolveString(root, val, forbiden) {
            if ( ! val instanceof String ) {
                throw new Error('Value not a string: ' + JSON.stringify(val));
            }
            val = this.resolveVars(root, val, forbiden, '@', '@');
            val = this.resolveVars(root, val, forbiden, '$', '');
            return val;
        }

        resolveVars(root, str, forbiden, ch, prefix) {
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
            var val = root.param(prefix + name);
            if ( ! val ) {
                throw new Error('No value for parameter: ' + ch + name);
            }
            var resolved = str.slice(0, at) + val + str.slice(close + 1);
            return this.resolveVars(root, resolved, forbiden);
        }

        // compile databases and servers (resolving import priority) and source sets
        //
        // `root` can be the root module, or the environ itself
        // this function sets the _hosts, _databases, _servers, _sources, _mimetypes,
        // _roles and _users on it
        compile(root)
        {
            // start by resolving the param references (could it be done on the
            // fly whilst compiling?)
            this.resolve(root);

            // resolve the connection infos
            [ 'host', 'user', 'password' ].forEach(name => {
                var val = this.param('@' + name);
                if ( ! val ) {
                    if ( this.proj && this.proj.connect && this.proj.connect[name] ) {
                        this.param('@' + name, this.proj.connect[name]);
                    }
                    else if ( this.ctxt.connect && this.ctxt.connect[name] ) {
                        this.param('@' + name, this.ctxt.connect[name]);
                    }
                }
            });

            // merge database and server JSON objects
            var cache = {
                href      : "@root",
                hosts     : [],
                hostNames : {},
                dbs       : [],
                dbIds     : {},
                dbNames   : {},
                srvs      : [],
                srvIds    : {},
                srvNames  : {},
                srcs      : [],
                srcNames  : {},
                mimes     : [],
                mimeNames : {},
                roles     : [],
                roleNames : {},
                users     : [],
                userNames : {}
            };
            this.compileImpl(cache);

            // instantiate all mime types now
            root._mimetypes = cache.mimes.map(m => {
                return new cmp.MimeType(m);
            });

            // instantiate all roles now
            root._roles = cache.roles.map(m => {
                return new cmp.Role(m);
            });

            // instantiate all users now
            root._users = cache.users.map(m => {
                return new cmp.User(m);
            });

            // instantiate all sources now
            let dfltSrc = cache.srcs.find(s => s.name === '@default');
            let dflt    = dfltSrc && new cmp.SourceSet(dfltSrc);
            root._sources = cache.srcs.filter(s => s.name !== '@default').map(s => {
                return new cmp.SourceSet(s, root, dflt);
            });

            // instantiate all hosts now
            root._hosts = cache.hosts.map(h => {
                return new cmp.Host(h);
            });

            // compile databases and servers
            this.compileDbsSrvs(root, cache, root.source('src'));

            // compile apis
            this.compileApis(root, cache);
        }

        compileApis(root, cache)
        {
            // "flatten" the import graph in a single array
            // most priority at index 0, least priority at the end
            var imports = [];
            var flatten = mod => {
                if ( ! imports.includes(mod) ) {
                    imports.push(mod);
                    mod.imports.forEach(i => flatten(i));
                }
            };
            flatten(this);
            // overrides lhs props with those in rhs, if any
            var collapse = (lhs, rhs) => {
                if ( rhs ) {
                    Object.keys(rhs).forEach(k => lhs[k] = rhs[k]);
                }
            };
            root._overridenApis = {};
            root._apis          = {};
            // loop over all known apis
            Object.keys(DEFAULT_APIS).forEach(name => {
                // start with nothing
                root._overridenApis[name] = {};
                root._apis[name]          = {};
                // walk the flatten import graph
                for ( let i = imports.length - 1; i >= 0; --i ) {
                    let apis = imports[i].json.apis;
                    collapse(root._overridenApis[name], apis && apis[name]);
                }
                Object.keys(DEFAULT_APIS[name]).forEach(p => {
                    root._apis[name][p] =
                        root._overridenApis[name][p]
                        || DEFAULT_APIS[name][p];
                });
            });
        }

        compileDbsSrvs(root, cache, src)
        {
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
            var allCandidates = (cache, res) => {
                var all = [];
                cache.dbs.forEach(db => {
                    all = all.concat(candidates(db, res));
                });
                cache.srvs.forEach(srv => {
                    all = all.concat(candidates(srv.content, res));
                    all = all.concat(candidates(srv.modules, res));
                });
                return all;
            }

            // return all databases and servers for which there is some unmet dependency
            var unsolved = (cache, res) => {
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
                cache.dbs.forEach(db => {
                    all = all.concat(impl(db));
                });
                cache.srvs.forEach(srv => {
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
            while ( ( cands = allCandidates(cache, res) ).length ) {
                cands.forEach(db => instantiate(db, res));
            }
            root._databases = res.list;

            // ensure we have instantiated all databases
            var leftover = unsolved(cache, res);
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
            root._servers = cache.srvs.map(srv => {
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
                return new cmp.Server(srv, resolve(srv.content), resolve(srv.modules), src, this.ctxt.platform);
            });
        }

        // recursive implementation of compile(), caching databases and servers
        compileImpl(cache)
        {
            // small helper to format info and error messages
            var _ = (c) => {
                return 'id=' + (c.id || '') + '|name=' + (c.name || '');
            };

            // the common implementation for databases and servers
            var impl = (comp, cache, ids, names, kind) => {
                // at least one of ID and name mandatory
                if ( ! comp.name && ! comp.id ) {
                    throw new Error('No ID and no name on ' + kind.kind + ' in ' + cache.href);
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
                        throw new Error('Different compose actions for ' + kind.kind + 's: derived:'
                                        + _(derived) + '|compose=' + derived.compose + ' and base:'
                                        + _(comp) + '|compose=' + comp.compose);
                    }
                    else if ( derived.compose === 'merge' ) {
                        this.ctxt.display.info('Merge ' + kind.kind + 's derived:' + _(derived) + ' and base:' + _(comp));
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
                            else {
                                derived[p] = kind.merge(p, derived[p], comp[p]);
                            }
                        }
                    }
                    else if ( derived.compose === 'hide' ) {
                        this.ctxt.platform.info('Hide ' + kind.kind + ' base:' + _(comp) + ' by derived:' + _(derived));
                    }
                    else {
                        throw new Error('Unknown compose on ' + kind.kind + ': ' + _(derived) + '|compose=' + derived.compose);
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

            // compile hosts
            if ( this.json.hosts ) {
                this.json.hosts.forEach(host => {
                    impl(host, cache.hosts, null, cache.hostNames, cmp.Host);
                });
            }
            // compile databases
            if ( this.json.databases ) {
                this.json.databases.forEach(db => {
                    impl(db, cache.dbs, cache.dbIds, cache.dbNames, cmp.Database);
                });
            }
            // compile servers
            if ( this.json.servers ) {
                this.json.servers.forEach(srv => {
                    impl(srv, cache.srvs, cache.srvIds, cache.srvNames, cmp.Server);
                });
            }
            // compile sources
            if ( this.json.sources ) {
                this.json.sources.forEach(src => {
                    impl(src, cache.srcs, null, cache.srcNames, cmp.SourceSet);
                });
            }
            // compile mime types
            if ( this.json['mime-types'] ) {
                this.json['mime-types'].forEach(mime => {
                    impl(mime, cache.mimes, null, cache.mimeNames, cmp.MimeType);
                });
            }
            // compile roles
            if ( this.json.roles ) {
                this.json.roles.forEach(role => {
                    impl(role, cache.roles, null, cache.roleNames, cmp.Role);
                });
            }
            // compile users
            if ( this.json.users ) {
                this.json.users.forEach(user => {
                    impl(user, cache.users, null, cache.userNames, cmp.User);
                });
            }
            // recurse on imports
            this.imports.forEach(i => {
                cache.href = i.path;
                i.compileImpl(cache);
            });
        }
    }

    const DEFAULT_APIS = {
        manage: {
            root : '/manage/v2',
            port : 8002,
            ssl  : false
        },
        rest: {
            root : '/v1/rest-apis',
            port : 8002,
            ssl  : false
        },
        admin: {
            root : '/admin/v1',
            port : 8001,
            ssl  : false
        },
        client: {
            root : '/v1',
            port : 8000,
            ssl  : false
        },
        xdbc: {
            root : '',
            port : 8000,
            ssl  : false
        }
    };

    module.exports = {
        Environ : Environ,
        Module  : Module
    };
}
)();
