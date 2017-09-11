"use strict";

(function() {

    const match = require("minimatch")
    const act   = require('./action');
    const props = require('./properties');

    /*~
     * Interface of a component.
     */
    class Component
    {
        show(display) {
            throw new Error('Component.show is abstract');
        }
        setup(actions, display) {
            throw new Error('Component.setup is abstract');
        }
    }

    /*~
     * A system database.
     */
    class SysDatabase extends Component
    {
        constructor(name)
        {
            super();
            this.name = name;
        }
    }

    /*~
     * A database.
     */
    class Database extends Component
    {
        constructor(json, schema, security, triggers)
        {
            super();
            this.id         = json.id;
            this.name       = json.name;
            this.properties = json.properties;
            this.schema     = schema   === 'self' ? this : schema;
            this.security   = security === 'self' ? this : security;
            this.triggers   = triggers === 'self' ? this : triggers;
            this.forests    = {};
            // extract the configured properties
            this.props      = props.database.parse(json);
            // the forests
            var forests = json.forests;
            if ( forests === null || forests === undefined ) {
                forests = 1;
            }
            if ( Number.isInteger(forests) ) {
                if ( forests < 0 ) {
                    throw new Error('Negative number of forests (' + forests + ') on id:'
                                    + json.id + '|name:' + json.name);
                }
                if ( forests > 100 ) {
                    throw new Error('Number of forests greater than 100 (' + forests + ') on id:'
                                    + json.id + '|name:' + json.name);
                }
                var array = [];
                for ( var i = 1; i <= forests; ++i ) {
                    var num = i.toLocaleString('en-IN', { minimumIntegerDigits: 3 });
                    array.push(json.name + '-' + num);
                }
                forests = array;
            }
            forests.forEach(f => {
                this.forests[f] = new Forest(this, f);
            });
        }

        show(display)
        {
            display.database(
                this.name,
                this.id,
                this.schema,
                this.security,
                this.triggers,
                Object.keys(this.forests).sort(),
                this.props);
        }

        setup(actions, display)
        {
            display.check(0, 'the database', this.name);
            const body    = new act.DatabaseProps(this).execute(actions.ctxt);
            const forests = new act.ForestList().execute(actions.ctxt);
            const items   = forests['forest-default-list']['list-items']['list-item'];
            const names   = items.map(o => o.nameref);
            // if DB does not exist yet
            if ( ! body ) {
                this.create(actions, display, names);
            }
            // if DB already exists
            else {
                this.update(actions, display, body, names);
            }
        }

        create(actions, display, forests)
        {
            display.add(0, 'create', 'database', this.name);
            // the base database object
            var obj = {
                "database-name": this.name
            };
            // its schema, security and triggers DB
            this.schema   && ( obj['schema-database']   = this.schema.name   );
            this.security && ( obj['security-database'] = this.security.name );
            this.triggers && ( obj['triggers-database'] = this.triggers.name );
            // its properties
            Object.keys(this.props).forEach(p => {
                this.props[p].create(obj);
            });
            if ( this.properties ) {
                Object.keys(this.properties).forEach(p => {
                    if ( obj[p] ) {
                        throw new Error('Explicit property already set on database: name='
                                        + this.name + ',id=' + this.id + ' - ' + p);
                    }
                    obj[p] = this.properties[p];
                });
            }
            // enqueue the "create db" action
            actions.add(new act.DatabaseCreate(this, obj));
            display.check(1, 'forests');
            // check the forests
            Object.keys(this.forests).forEach(f => {
                this.forests[f].create(actions, display, forests);
            });
        }

        update(actions, display, body, forests)
        {
            // check databases
            this.updateDb(actions, display, this.schema,   body, 'schema-database',   'Schemas');
            this.updateDb(actions, display, this.security, body, 'security-database', 'Security');
            this.updateDb(actions, display, this.triggers, body, 'triggers-database', null);

            // check forests
            display.check(1, 'forests');
            var actual  = body.forest || [];
            var desired = Object.keys(this.forests);
            // forests to remove: those in `actual` but not in `desired`
            actual
                .filter(name => ! desired.includes(name))
                .forEach(name => {
                    new Forest(this, name).remove(actions, display);
                });
            // forests to add: those in `desired` but not in `actual`
            desired
                .filter(name => ! actual.includes(name))
                .forEach(name => {
                    this.forests[name].create(actions, display, forests);
                });

            // check properties
            display.check(1, 'properties');
            Object.keys(this.props).forEach(p => {
                let res = this.props[p];
                // TODO: Rather fix the "_type" setting mechanism, AKA the "root cause"...
                if ( ! res.prop._type ) {
                    res.prop._type = 'database';
                }
                res.update(actions, display, body, this);
            });
            if ( this.properties ) {
                Object.keys(this.properties).forEach(p => {
                    if ( this.properties[p] !== actual[p] ) {
                        actions.add(new act.DatabaseUpdate(this, p, this.properties[p]));
                    }
                });
            }
        }

        updateDb(actions, display, db, body, prop, dflt)
        {
            var actual = body[prop];
            var newName;

            // do not exist, not desired
            if ( ! actual && ! db || (actual === dflt && ! db) ) {
                // nothing
            }
            // does exist, to remove
            else if ( ! db ) {
                newName = dflt || null;
            }
            // do not exist, to create, or does exist, to chamge
            else if ( ! actual || (actual !== db.name) ) {
                newName = db.name;
            }
            // already set to the right db
            else {
                // nothing
            }

            // enqueue the action if necessary
            if ( newName !== undefined ) {
                display.add(0, 'update', prop);
                actions.add(new act.DatabaseUpdate(this, prop, newName));
            }
        }
    }

    /*~
     * A forest.
     */
    class Forest extends Component
    {
        constructor(db, name)
        {
            super();
            this.db   = db;
            this.name = name;
        }

        create(actions, display, forests)
        {
            // if already exists, attach it instead of creating it
            if ( forests.includes(this.name) ) {
                display.add(1, 'attach', 'forest', this.name);
                actions.add(new act.ForestAttach(this));
            }
            else {
                display.add(1, 'create', 'forest', this.name);
                actions.add(new act.ForestCreate(this));
            }
        }

        remove(actions, display)
        {
            display.remove(1, 'detach', 'forest', this.name);
            // just detach it, not delete it for real
            actions.add(new act.ForestDetach(this));
        }
    }

    /*~
     * A server.
     */
    class Server extends Component
    {
        constructor(json, content, modules)
        {
            super();
            this.type       = json.type;
            this.group      = json.group || 'Default';
            this.id         = json.id;
            this.name       = json.name;
            this.properties = json.properties;
            this.content    = content;
            this.modules    = modules;
            // extract the configured properties
            this.props      = props.server.parse(json);
            // TODO: If no modules DB and no root, and if there is a source set
            // attached to this server, use its directory as the root of the
            // server, to have the modules on disk.  When attaching source sets
            // to servers and databases is supported...
            if ( json['rest-config'] ) {
                if ( this.type !== 'rest' ) {
                    throw new Error('REST config on a non-REST server: ' + this.type
                                   + ' - ' + this.id + '/' + this.name);
                }
                this.rest = json['rest-config'];
            }
        }

        show(display)
        {
            display.server(
                this.name,
                this.id,
                this.type,
                this.group,
                this.content,
                this.modules,
                this.props);
        }

        setup(actions, display)
        {
            display.check(0, 'the ' + this.type + ' server', this.name);
            const body = new act.ServerProps(this).execute(actions.ctxt);
            // if AS does not exist yet
            if ( ! body ) {
                if ( this.type === 'http' ) {
                    this.createHttp(actions, display);
                }
                else {
                    this.createRest(actions, display);
                }
            }
            // if AS already exists
            else {
                if ( this.type === 'rest' ) {
                    this.updateRest(actions, display, body);
                }
                this.updateHttp(actions, display, body);
            }
        }

        createAddProps(obj)
        {
            Object.keys(this.props).forEach(p => {
                this.props[p].create(obj);
            });
            if ( this.properties ) {
                Object.keys(this.properties).forEach(p => {
                    if ( obj[p] ) {
                        throw new Error('Explicit property already set on server: name='
                                        + this.name + ',id=' + this.id + ' - ' + p);
                    }
                    obj[p] = this.properties[p];
                });
            }
        }

        createHttp(actions, display)
        {
            display.add(0, 'create', 'http server', this.name);
            // the base server object
            var obj = {
                "server-name":      this.name,
                "server-type":      this.type,
                "content-database": this.content.name
            };
            // its modules DB
            this.modules && ( obj['modules-database'] = this.modules.name );
            // its properties
            this.createAddProps(obj);
            // enqueue the "create server" action
            actions.add(new act.ServerCreate(this, obj));
        }

        createRest(actions, display)
        {
            display.add(0, 'create', 'rest server', this.name);
            let obj = {
                "name":             this.name,
                "group":            this.group,
                "database":         this.content.name,
                "modules-database": this.modules.name
            };
            this.props.port.create(obj);
            if ( this.rest ) {
                if ( this.rest['error-format'] ) {
                    obj['error-format'] = this.rest['error-format'];
                }
                if ( this.rest['xdbc'] ) {
                    obj['xdbc-enabled'] = this.rest['xdbc'];
                }
            }
            // enqueue the "create rest server" action
            actions.add(new act.ServerRestCreate(this, { "rest-api": obj }));
            // its other properties
            let extra = {};
            this.createAddProps(extra);
            // port is handled at creation
            delete extra['port'];
            delete extra['server-type'];
            if ( Object.keys(extra).length ) {
                // enqueue the "update server" action
                actions.add(new act.ServerUpdate(this, extra));
            }
            if ( this.rest ) {
                let keys = Object.keys(this.rest).filter(k => {
                    return k !== 'error-format' && k !== 'xdbc';
                });
                if ( keys.length ) {
                    const map = {
                        "debug":            'debug',
                        "tranform-all":     'document-transform-all',
                        "tranform-out":     'document-transform-out',
                        "update-policy":    'update-policy',
                        "validate-options": 'validate-options',
                        "validate-queries": 'validate-queries'
                    };
                    let props = {};
                    keys.forEach(k => {
                        let p = map[k];
                        if ( ! p ) {
                            throw new Error('Unknown property on server.rest: ' + k);
                        }
                        props[p] = this.rest[k];
                    });
                    // enqueue the "update rest server props" action
                    actions.add(new act.ServerRestUpdate(this, props, this.props.port.value));
                }
            }
        }

        // TODO: It should not be hard to make it possible to add more and more
        // property/value pairs to the server update action, and send them all
        // in one request.  That would have an impact on displaying the action
        // though, as we would probably want to keep multiple lines for multiple
        // properties, as it is clearer.
        //
        updateHttp(actions, display, actual)
        {
            if ( 'http' !== actual['server-type'] ) {
                throw new Error('Server type cannot change, from '
                                + actual['server-type'] + ' to ' + this.type);
            }
            // the content and modules databases
            if ( this.content.name !== actual['content-database'] ) {
                display.add(0, 'update', 'content-database');
                actions.add(new act.ServerUpdate(this, 'content-database', this.content.name));
            }
            if ( ( ! this.modules && actual['modules-database'] )
                 || ( this.modules && ! actual['modules-database'] )
                 || ( this.modules && this.modules.name !== actual['modules-database'] ) ) {
                var mods = this.modules ? this.modules.name : 0;
                display.add(0, 'update', 'modules-database');
                actions.add(new act.ServerUpdate(this, 'modules-database', mods));
            }

            // check properties
            display.check(1, 'properties');
            Object.keys(this.props)
                .filter(p => p !== 'server-type')
                .forEach(p => {
                    this.props[p].update(actions, display, actual, this);
                });
            if ( this.properties ) {
                Object.keys(this.properties).forEach(p => {
                    if ( this.properties[p] !== actual[p] ) {
                        actions.add(new act.ServerUpdate(this, p, this.properties[p]));
                    }
                });
            }
        }

        /*~
         * For a REST server, check REST-specific config items (its "creation
         * properties", the values passed to the endpoint when creating the REST
         * server), like `xdbc-enabled`.  These properties are to be retrieved
         * from `:8002/v1/rest-apis/[name]`.
         *
         * There seems to be no way to change the value of such a creation
         * property (they are used at creation only).
         *
         * In addition, there are properties specific to REST servers (not for
         * HTTP), like `debug` and `update-policy`.  These properties are to be
         * retrieved from `:[port]/v1/config/properties`.
         *
         * 1) retrieve creation properties, if anything differs, -> error
         * 2) retrieve properties, and update them, as for any component
         */
        updateRest(actions, display, actual)
        {
            // 1) check creation properties for any difference
            const check = (name, old, current) => {
                if ( old !== current ) {
                    throw new Error('Cannot update REST server ' + name + ', from ' + old + ' to ' + current);
                }
            };
            const bool = val => {
                var type = typeof val;
                if ( 'boolean' === type ) {
                    return val;
                }
                else if ( 'string' === type ) {
                    if ( 'false' === val ) {
                        return false;
                    }
                    else if ( 'true' === val ) {
                        return true;
                    }
                    else {
                        throw new Error('Invalid boolean value: ' + val);
                    }
                }
                else {
                    throw new Error('Boolean value neither a string or a boolean: ' + type);
                }
            };
            const cprops = new act.ServerRestCreationProps(this).execute(actions.ctxt);
            check('name',             cprops.name,                  this.name);
            check('group',            cprops.group,                 this.group);
            check('database',         cprops.database,              this.content && this.content.name);
            check('modules-database', cprops['modules-database'],   this.modules && this.modules.name);
            check('port',             parseInt(cprops.port, 10),    this.props.port && this.props.port.value);
            check('error-format',     cprops['error-format'],       this.rest && this.rest['error-format']);
            check('xdbc-enabled',     bool(cprops['xdbc-enabled']), bool(this.rest && this.rest.xdbc));

            // 2) update all properties with different value
            let obj = {};
            const update = (name, old, current, dflt) => {
                if ( old !== (current === undefined ? dflt : current) ) {
                    obj[name] = current;
                }
            };
            const props = new act.ServerRestProps(this, this.props.port.value).execute(actions.ctxt);
            update('debug',                  bool(props['debug']),                  this.rest && this.rest['debug'],               false);
            update('document-transform-all', bool(props['document-transform-all']), this.rest && this.rest['transform-all'],       true);
            update('document-transform-out', props['document-transform-out'],       this.rest && this.rest['transform-out'] || '', '');
            update('update-policy',          props['update-policy'],                this.rest && this.rest['update-policy'],       'merge-metadata');
            update('validate-options',       bool(props['validate-options']),       this.rest && this.rest['validate-options'],    true);
            update('validate-queries',       bool(props['validate-queries']),       this.rest && this.rest['validate-queries'],    false);
            if ( Object.keys(obj).length ) {
                actions.add(new act.ServerRestUpdate(this, obj, this.props.port.value));
            }
        }
    }

    /*~
     * A named source set.
     */
    class SourceSet extends Component
    {
        constructor(json, dflt)
        {
            super();
            this.dflt  = dflt;
            this.name  = json && json.name;
            // extract the configured properties
            this.props = json ? props.source.parse(json) : {};
        }

        show(display)
        {
            // TODO: What about this.dflt...?
            display.source(
                this.name,
                this.props);
        }

        prop(name)
        {
            let v = this.props[name];
            if ( ! v && this.dflt ) {
                v = this.dflt.props[name];
            }
            if ( v ) {
                return v.value;
            }
            if ( name === 'garbage' ) {
                return [ 'TODO: Set the default default garbage value...', '*~' ];
            }
        }

        load(actions, db, display)
        {
            let   matches = [];
            const onFlush = () => {
                actions.add(
                    new act.MultiDocInsert(db, matches));
                // empty the array
                matches.splice(0);
            };
            const onMatch = (path, uri) => {
                matches.push({ uri: uri, path: path });
                if ( matches.length >= INSERT_LENGTH ) {
                    onFlush();
                }
            };
            this.walk(actions.ctxt, display, onMatch);
            if ( matches.length ) {
                onFlush();
            }
        }

        walk(ctxt, display, onMatch)
        {
            // from one array of strings, return two arrays:
            // - first one with all strings ending with '/', removed
            // - second one with all strings not ending with '/'
            const dirNotDir = pats => {
                let dir    = [];
                let notdir = [];
                if ( pats ) {
                    pats.forEach(p => {
                        if ( p.endsWith('/') ) {
                            dir.push(p.slice(0, -1));
                        }
                        else {
                            notdir.push(p);
                        }
                    });
                }
                return [ dir, notdir ];
            };

            const options = { matchBase: true, dot: true, nocomment: true };

            const compile = name => {
                let pats = this.prop(name);
                let res  = dirNotDir(pats);
                patterns.dir[name]            = res[0];
                patterns.dir['mm_' + name]    = res[0].map(p => new match.Minimatch(p, options));
                patterns.notdir[name]         = res[1];
                patterns.notdir['mm_' + name] = res[1].map(p => new match.Minimatch(p, options));
            };

            let patterns = {
                dir    : {},
                notdir : {}
            };

            compile('include');
            compile('exclude');
            compile('garbage');

            const dir  = this.prop('dir');
            const path = ctxt.platform.resolve(dir);
            this.walkDir(onMatch, '', dir, path, path, patterns, ctxt, display);
        }

        walkDir(onMatch, path, dir, full, base, patterns, ctxt, display)
        {
            const pf = ctxt.platform;

            const match = (path, compiled, ifNone, msg) => {
                if ( ! compiled.length ) {
                    return ifNone;
                }
                for ( let i = 0; i < compiled.length; ++i ) {
                    let c = compiled[i];
                    if ( c.match(path) ) {
                        if ( ctxt.verbose ) {
                            pf.warn('[' + pf.bold('verbose') + '] ' + msg
                                    + ' ' + path + ', matching ' + c.pattern);
                        }
                        return true;
                    }
                }
                return false;
            };

            display.check(0, 'the directory', dir);

            pf.dirChildren(full).forEach(child => {
                let p = path + '/' + child.name;
                let pats = child.isdir ? patterns.dir : patterns.notdir;
                if ( ! match(p, pats.mm_garbage, false, 'Throwing') ) {
                    let desc = {
                        base       : base,
                        path       : p,
                        full       : child.path,
                        name       : child.name,
                        isdir      : child.isdir,
                        isIncluded : match(p, pats.mm_include, true,  'Including'),
                        isExcluded : match(p, pats.mm_exclude, false, 'Excluding'),
                        include    : pats.include,
                        exclude    : pats.exclude,
                        mm_include : pats.mm_include,
                        mm_exclude : pats.mm_exclude
                    };
                    let resp = this.filter(desc);
                    if ( resp ) {
                        if ( child.isdir ) {
                            let d = dir + '/' + child.name;
                            this.walkDir(onMatch, p, d, desc.full, base, patterns, ctxt, display);
                        }
                        else {
                            let uri = resp.uri || resp.path;
                            if ( ! uri ) {
                                throw new Error('Impossible to compute URI for ' + resp);
                            }
                            let full = resp.full || resp.path && (base + resp.path);
                            // TODO: Support resp.content as well...
                            if ( ! full ) {
                                throw new Error('Impossible to compute full path for ' + resp);
                            }
                            onMatch(full, uri);
                        }
                    }
                }
            });
        }

        filter(desc) {
            if ( desc.isIncluded && ! desc.isExcluded ) {
                return desc;
            }
        }
    }

    // TODO: Set another, real-world length, or based on the size...
    // TODO: And of course, be able to set this (these) from the environs.
    const INSERT_LENGTH = 10;

    /*~
     * A source set wrapping just a plain dir.
     */
    class SourceDir extends SourceSet
    {
        constructor(dir)
        {
            super({ dir : dir });
        }
    }

    /*~
     * A source set wrapping just a plain doc.
     */
    class SourceDoc extends SourceSet
    {
        constructor(doc)
        {
            super();
            this.doc = doc;
        }

        load(actions, db, display)
        {
            display.check(0, 'the file', this.doc);
            actions.add(
                new act.DocInsert(db, this.uri(null, this.doc), this.doc));
        }

        uri(dir, path) {
            let idx = path.indexOf('/');
            if ( idx < 0 ) {
                throw new Error('Path in `load doc` must contain at least 1 parent dir');
            }
            return path.slice(idx);
        }
    }

    /*~
     * A MIME type.
     */
    class MimeType extends Component
    {
        constructor(json)
        {
            super();
            this.name  = json.name;
            // extract the configured properties
            this.props = props.mime.parse(json);
        }

        show(display)
        {
            display.mimetype(
                this.name,
                this.props);
        }

        setup(actions, display)
        {
            display.check(0, 'the mime type', this.name);
            const body = new act.MimeProps(this).execute(actions.ctxt);
            // if mime does not exist yet
            if ( ! body ) {
                this.create(actions, display);
            }
            // if mime already exists
            else {
                this.update(actions, display, body);
            }
        }

        create(actions, display)
        {
            display.add(0, 'create', 'mime', this.name);
            var obj = {
                "name": this.name
            };
            Object.keys(this.props).forEach(p => {
                this.props[p].create(obj);
            });
            actions.add(new act.MimeCreate(this, obj));
        }

        update(actions, display, actual)
        {
            // check properties
            display.check(1, 'properties');
            Object.keys(this.props).forEach(p => {
                this.props[p].update(actions, display, actual, this);
            });
        }
    }

    module.exports = {
        SysDatabase : SysDatabase,
        Database    : Database,
        Server      : Server,
        SourceSet   : SourceSet,
        SourceDir   : SourceDir,
        SourceDoc   : SourceDoc,
        MimeType    : MimeType
    }
}
)();
