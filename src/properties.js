"use strict";

(function() {

    const act = require('./action');
    const err = require('./error');

    /*~
     * The base, abstract config item.
     */
    class ConfigItem
    {
        constructor(multiline) {
            this.multiline = multiline ? true : false;
        }

        type(type) {
            throw err.abstractFun('ConfigItem.type');
        }

        handle(result, value, key) {
            throw err.abstractFun('ConfigItem.handle');
        }
    }

    /*~
     * What is returned as the result of `parse()`.
     */
    class Result
    {
        constructor(prop, value) {
            this.prop  = prop;
            this.value = value;
        }

        show(pf, level) {
            if ( ! level ) {
                level = 1;
            }
            if ( Array.isArray(this.value) ) {
                this.value.forEach(v => {
                    pf.line(level, this.prop.label);
                    Object.keys(v).forEach(n => v[n].show(pf, level + 1));
                });
            }
            else {
                pf.line(level, this.prop.label, this.value);
            }
        }

        create(obj) {
            const impl = value => {
                if ( Array.isArray(value) ) {
                    return value.map(v => impl(v));
                }
                else if ( typeof value === 'object' ) {
                    let obj = {};
                    Object.keys(value).forEach(p => {
                        value[p].create(obj);
                    });
                    return obj;
                }
                else {
                    return value;
                }
            };
            obj[this.prop.name] = impl(this.value);
        }

        rawValue() {
            const impl = value => {
                if ( Array.isArray(value) ) {
                    return value.map(v => impl(v));
                }
                else if ( typeof value === 'object' ) {
                    let obj = {};
                    Object.keys(value).forEach(p => obj[p] = value[p].rawValue());
                    return obj;
                }
                else {
                    return value;
                }
            };
            return impl(this.value);
        }

        update(actions, display, body, comp) {
            var val = this.rawValue();
            if ( ! this.prop.compare(val, body[this.prop.name]) ) {
                if ( this.prop.frozen ) {
                    throw new Error('Property differ but is frozen on ' + comp.name + ': ' + this.prop.name + ', please proceed manually');
                }
                display.add(1, 'update', this.prop.label);
                if ( 'database' === this.prop._type ) {
                    actions.add(new act.DatabaseUpdate(comp, this.prop.name, val));
                }
                else if ( 'server' === this.prop._type ) {
                    actions.add(new act.ServerUpdate(comp, this.prop.name, val));
                }
                else if ( 'user' === this.prop._type ) {
                    actions.add(new act.UserUpdate(comp, this.prop.name, val));
                }
                else if ( 'role' === this.prop._type ) {
                    actions.add(new act.RoleUpdate(comp, this.prop.name, val));
                }
                else {
                    let msg = 'Unsupported component type: ' + this.prop._type;
                    if ( display.verbose ) {
                        msg += ' - ';
                        msg += JSON.stringify(this.prop);
                    }
                    throw new Error(msg);
                }
            }
        }
    }

    /*~
     * The config item for objects, including databases, servers and source sets themselves.
     */
    class ConfigObject
    {
        constructor(type) {
            this._type       = type;
            this.props       = {};
            this.mandatories = {};
            this.defaults    = {};
            this.frozen      = {};
        }

        type(type) {
            this._type = type + '.' + this._type;
            Object.keys(this.props).forEach(p => this.props[p].type(type));
        }

        add(path, mandatory, prop) {
            if ( this.props[path] !== undefined ) {
                throw new Error('Property already configured: ' + path);
            }
            this.props[path] = prop;
            if ( mandatory ) {
                this.mandatories[path] = prop;
            }
            prop.type(this._type);
            return this;
        }

        dflt(path, val) {
            if ( this.defaults[path] !== undefined ) {
                throw new Error('Property default already configured: ' + path);
            }
            if ( this.mandatories[path] !== undefined ) {
                throw new Error('Cannot have default for a mandatory property: ' + path);
            }
            this.defaults[path] = val;
            return this;
        }

        freeze(path) {
            if ( this.frozen[path] !== undefined ) {
                throw new Error('Property already frozen: ' + path);
            }
            this.frozen[path] = true;
            return this;
        }

        parse(config, result, ctxt) {
            // do not provide any when calling top-level
            if ( ! result ) {
                result = {};
            }
            // extract values
            Object.keys(config).forEach(cfg => {
                var prop = this.props[cfg];
                if ( ! prop ) {
                    throw new Error('Unknwon config property: ' + this._type + '.' + cfg);
                }
                var value = config[cfg];
                if ( value !== null ) {
                    prop.handle(result, value, cfg, ctxt);
                }
            });
            // chack mandatory properties
            this.ensure(result);
            // add the default values
            Object.keys(this.defaults).forEach(dflt => {
                if ( config[dflt] === undefined ) {
                    var prop  = this.props[dflt];
                    var value = this.defaults[dflt];
                    if ( 'function' === typeof value ) {
                        value = value(result);
                    }
                    prop.handle(result, value, dflt, ctxt);
                }
            });
            // return it
            return result;
        }

        ensure(result) {
            Object.keys(this.mandatories).forEach(p => {
                var prop = this.mandatories[p];
                if ( prop instanceof Ignore ) {
                    // nothing
                }
                else if ( prop instanceof ConfigObject ) {
                    prop.ensure(result);
                }
                else if ( ! Object.keys(result).find(res => res === prop.name) ) {
                    throw new Error('Mandatory config prop ' + this._type + '.' + prop.name + ' not set');
                }
            });
        }

        handle(result, value, key) {
            // recurse parsing
            this.parse(value, result);
        }
    }

    /*~
     * A config property to ignore.
     *
     * This is for pieces of the config files taken care of specially, in the
     * code.  For instance `compose`, which defines how to compose several
     * components, based on their "inheritence".
     */
    class Ignore extends ConfigItem
    {
        handle() {
            // ignore
        }

        type() {
            // ignore
        }
    }

    /*~
     * A database.
     *
     * For now, it is not used, it is handled in the code, so use `Ignore`.
     */
    class Database extends ConfigItem
    {
        constructor(name) {
            super();
            this.name = name;
        }

        handle(result, value, key) {
            console.log('TODO: implement Database.handle(): ' + this.name + ' / ' + key);
        }

        type() {
            console.log('TODO: implement Database.type(): ' + this.name + ' / ' + key);
        }
    }

    /*~
     * An array of objects, each of a different type in a defined set.
     *
     * This is used for range indexes, which are all in one single array.  But
     * each can be of one of 3 types: element range, attribute range or path
     * range.
     */
    class MultiArray extends ConfigItem
    {
        constructor() {
            super(true);
            this.items = [];
        }

        add(pred, item) {
            this.items.push({
                pred: pred,
                prop: item
            });
            return this;
        }

        type(type) {
            this.items.forEach(item => {
                item.prop.type(type);
            });
        }

        handle(result, value, key) {
            for ( var i = 0; i < value.length; ++i ) {
                var v = value[i];
                var k = 0;
                var item;
                do {
                    item = this.items[k++];
                }
                while ( k < this.items.length && ! item.pred(v) );
                if ( item ) {
                    item.prop.handle(result, v, key);
                }
                else {
                    throw new Error('No predicate matches the value in multi array: ' + key);
                }
            }
        }
    }

    /*~
     * An array of objects.  Supoprts `Multiplexer`.
     */
    class ObjectArray extends ConfigItem
    {
        constructor(name, label, prop) {
            super(true);
            this.name  = name;
            this.label = label;
            this.prop  = prop;
        }

        type(type) {
            this.prop.type(type);
        }

        handle(result, value, key) {
            if ( ! result[this.name] ) {
                result[this.name] = new Result(this, []);
            }
            var r     = this.prop.parse(value);
            var all   = [];
            var multi = Object.keys(this.prop.props).filter(p => {
                return this.prop.props[p] instanceof Multiplexer;
            });
            if ( multi.length === 0 ) {
                all.push(r);
            }
            else if ( multi.length === 1 ) {
                var name = this.prop.props[multi[0]].name;
                var val  = r[name].value;
                if ( Array.isArray(val) ) {
                    val.forEach(v => {
                        var o = {};
                        Object.keys(r).filter(n => n !== name).forEach(n => o[n] = r[n]);
                        o[name] = new Result(r[name].prop, v);
                        all.push(o);
                    });
                }
                else {
                    all.push(r);
                }
            }
            else {
                throw new Error('Several multiplexer in the same object not supported');
            }
            all.forEach(one => result[this.name].value.push(one));
        }

        // undefined compares equal to the empty array
        compare(lhs, rhs) {
            if ( lhs === undefined ) {
                lhs = [];
            }
            if ( rhs === undefined ) {
                rhs = [];
            }
            if ( ! Array.isArray(lhs) ) {
                throw new Error('lhs is not an array');
            }
            if ( ! Array.isArray(rhs) ) {
                throw new Error('rhs is not an array');
            }
            if ( lhs.length !== rhs.length ) {
                return false;
            }
            var found = true;
            for ( var l = 0; l < lhs.length && found; ++l ) {
                found = false;
                var left   = lhs[l];
                var lprops = Object.keys(left).sort();
                for ( var r = 0; r < rhs.length && ! found; ++r ) {
                    var right  = rhs[r];
                    var rprops = Object.keys(right).sort();
                    if ( lprops.length === rprops.length ) {
                        var equal  = true;
                        for ( var i = 0; i < lprops.length && equal; ++i ) {
                            var name = lprops[i];
                            equal = ( rprops[i] === name )
                                && ( left[name] === right[name] );
                        }
                        found = equal;
                    }
                }
            }
            return found;
        }
    }

    /*~
     * In an `ObjectArray`, marks a config item to demultiply its enclosing object.
     *
     * This is used for `name` in range indexes, for instance.  In that case,
     * the name of one range index is a string.  But with the Multiplexer, it
     * can be an array of strings instead, which will result in creating an
     * array of the object containing it, having all the some values, except
     * each has a different name.
     */
    class Multiplexer extends ConfigItem
    {
        constructor(prop) {
            super();
            this.prop = prop;
            this.name = prop.name;
        }

        handle(result, value, key) {
            this.prop.handle(result, value, key);
        }

        type(type) {
            this.prop.type(type);
        }
    }

    /*~
     * An object, to represent an array of 2 properties (as key and value).
     */
    class CouplesAsMap extends ConfigItem
    {
        constructor(name, label, key, value) {
            super();
            this.name    = name;
            this.label   = label;
            this.keyProp = key;
            this.valProp = value;
        }

        handle(result, value, key) {
            if ( result[this.name] !== undefined ) {
                throw new Error('Property already exists: ' + this.name);
            }
            const prefix = new String('prefix',        'namespace prefix');
            const uri    = new String('namespace-uri', 'namespace uri');
            let v = Object.keys(value).map(p => {
                // return { "prefix": p, "namespace-uri": value[p] };
                return {
                    "prefix"        : new Result(prefix, p),
                    "namespace-uri" : new Result(uri, value[p])
                };
            });
            result[this.name] = new Result(this, v);
        }

        compare(lhs, rhs) {
            if ( lhs === undefined ) {
                lhs = [];
            }
            if ( rhs === undefined ) {
                rhs = [];
            }
            if ( lhs.length !== rhs.length ) {
                return false;
            }
            let lhs_obj = {};
            let rhs_obj = {};
            lhs.forEach(item => lhs_obj[item.prefix] = item["namespace-uri"]);
            rhs.forEach(item => rhs_obj[item.prefix] = item["namespace-uri"]);
            let lhs_keys = Object.keys(lhs_obj).sort();
            let rhs_keys = Object.keys(rhs_obj).sort();
            if ( lhs_keys.length !== rhs_keys.length ) {
                return false;
            }
            for ( let i = 0; i < lhs_keys.length; ++i ) {
                let key = lhs_keys[i];
                if ( key !== rhs_keys[i] || lhs_obj[key] !== rhs_obj[key] ) {
                    return false;
                }
            }
            return true;
        }

        type(type) {
            if ( this._type ) {
                throw new Error('Type already set on ' + this.name + ': ' + this._type);
            }
            this._type = type;
        }
    }

    /*~
     * An object, to represent a list of permissions.
     */
    class Perms extends ConfigItem
    {
        constructor(name, label) {
            super();
            this.name  = name;
            this.label = label;
        }

        type(type) {
            if ( this._type ) {
                throw new Error('Type already set on ' + this.name + ': ' + this._type);
            }
            this._type = type;
        }

        handle(result, value, key) {
            if ( result[this.name] !== undefined ) {
                throw new Error('Property already exists: ' + this.name);
            }
            const role = new String('role-name', 'role');
            const cap  = new StringList('capability', 'capability', /\s*,\s*/);
            let res = [];
            Object.keys(value).forEach(p => {
                cap.value(value[p]).forEach(v => {
                    if ( v !== 'update' && v !== 'insert' && v !== 'read'
                         && v !== 'execute' && v !== 'node-update' ) {
                        throw new Error('Unknwon permission capability: ' + v);
                    }
                    res.push({
                        "role-name"  : new Result(role, p),
                        "capability" : new Result(cap, v)
                    });
                });
            });
            result[this.name] = new Result(this, res);
        }

        compare(lhs, rhs) {
            if ( lhs === undefined && rhs === undefined ) {
                return true;
            }
            if ( lhs === undefined || rhs === undefined ) {
                return false;
            }
            if ( lhs.length !== rhs.length ) {
                return false;
            }
            for ( let i = 0; i < lhs.length; ++i ) {
                const equal = item => {
                    return lhs[i]['role-name'] === item['role-name']
                        && lhs[i].capability   === item.capability;
                };
                if ( ! rhs.find(equal) ) {
                    return false;
                }
            }
            return true;
        }
    }

    /*~
     * An object, to represent a list of privileges, e.g. for a role.
     */
    class Privileges extends ConfigItem
    {
        constructor(name, label) {
            super();
            this.name  = name;
            this.label = label;
        }

        type(type) {
            if ( this._type ) {
                throw new Error('Type already set on ' + this.name + ': ' + this._type);
            }
            this._type = type;
        }

        handle(result, value, key, ctxt) {
            if ( result[this.name] !== undefined ) {
                throw new Error('Property already exists: ' + this.name);
            }
            const nameProp   = new String('privilege-name');
            const actionProp = new String('action');
            const kindProp   = new String('kind');
            const impl = (res, value, kind) => {
                new StringList(null, null, /\s*,\s*/)
                    .value(value || [])
                    .forEach(val => {
                        let action = Privileges.privilege(ctxt, val, kind);
                        res.push({
                            "privilege-name": new Result(nameProp, val),
                            action: new Result(actionProp, action),
                            kind: new Result(kindProp, kind)
                        });
                    });
            };
            let res = [];
            impl(res, value.execute, 'execute');
            impl(res, value.uri,     'uri');
            result[this.name] = new Result(this, res);
        }

        compare(lhs, rhs) {
            if ( lhs === undefined && rhs === undefined ) {
                return true;
            }
            if ( lhs === undefined || rhs === undefined ) {
                return false;
            }
            if ( lhs.length !== rhs.length ) {
                return false;
            }
            for ( let i = 0; i < lhs.length; ++i ) {
                const equal = item => {
                    return lhs[i]['role-name'] === item['role-name']
                        && lhs[i].capability   === item.capability;
                };
                if ( ! rhs.find(equal) ) {
                    return false;
                }
            }
            return true;
        }
    }

    // return the action URI resolved from the name
    Privileges.privilege = (ctxt, name, kind) => {
        if ( ! Privileges.cache ) {
            // TODO: Use an action for this, for proper verbose logging...
            let resp = ctxt.platform.get({ api: 'manage' }, '/privileges');
            if ( resp.status !== 200 ) {
                throw new Error('Retrieving privilege list not OK: ' + resp.status);
            }
            Privileges.cache = {
                execute: {},
                uri:     {}
            };
            resp.body['privilege-default-list']['list-items']['list-item'].forEach(item => {
                let target;
                if ( item.kind === 'execute' ) {
                    target = Privileges.cache.execute;
                }
                else if ( item.kind === 'uri' ) {
                    target = Privileges.cache.uri;
                }
                else {
                    throw new Error('Unknown kind in privilege list: ' + item.kind);
                }
                target[item.nameref] = item.action;
            });
        }
        let action;
        if ( kind === 'execute' ) {
            action = Privileges.cache.execute[name];
        }
        else if ( kind === 'uri' ) {
            action = Privileges.cache.uri[name];
        }
        else {
            throw new Error('Unknown privilege kind: ' + kind);
        }
        if ( ! action ) {
            throw new Error('Unknown privilege: ' + name);
        }
        return action;
    };

    /*~
     * A simple, atomic config item (base for string, integer, etc.)
     */
    class Simple extends ConfigItem
    {
        constructor(name, label) {
            super();
            this.name   = name;
            this.label  = label;
            this.frozen = false;
        }

        freeze() {
            this.frozen = true;
            return this;
        }

        handle(result, value, key) {
            if ( result[this.name] !== undefined ) {
                throw new Error('Property already exists: ' + this.name);
            }
            result[this.name] = new Result(this, this.value(value));
        }

        compare(lhs, rhs) {
            return lhs === rhs;
        }

        type(type) {
            if ( this._type ) {
                throw new Error('Type already set on ' + this.name + ': ' + this._type);
            }
            this._type = type;
        }
    }

    /*~
     * A closed enumeration of strings.
     */
    class Enum extends Simple
    {
        constructor(name, label, values) {
            super(name, label);
            this.values = values;
        }

        value(val) {
            if ( ! this.values.includes(val) ) {
                throw new Error('Invalid value ' + val + ' in enum ' + this.name + ': ' + this.values);
            }
            return val;
        }
    }

    /*~
     * A simple boolean.
     */
    class Boolean extends Simple
    {
        constructor(name, label) {
            super(name, label);
        }

        value(val) {
            var type = typeof val;
            if ( 'boolean' === type ) {
                // great, nothing to do
            }
            else if ( 'string' === type ) {
                if ( 'false' === val ) {
                    val = false;
                }
                else if ( 'true' === val ) {
                    val = true;
                }
                else {
                    throw new Error('Invalid boolean value: ' + val);
                }
            }
            else {
                throw new Error('Boolean value neither a string or a boolean: ' + type);
            }
            return val;
        }
    }

    /*~
     * A simple integer.  If given as a string, it is parsed.
     */
    class Integer extends Simple
    {
        constructor(name, label) {
            super(name, label);
        }

        value(val) {
            var type = typeof val;
            if ( 'number' === type ) {
                if ( ! Number.isInteger(val) ) {
                    throw new Error('Integer value is a non-integer number: ' + val);
                }
            }
            else if ( 'string' === type ) {
                if ( ! /^[0-9]+$/.test(val) ) {
                    throw new Error('Not a lexically valid integer value: ' + val);
                }
                val = Number.parseInt(val, 10);
            }
            else {
                throw new Error('Integer value neither a string or a number: ' + type);
            }
            return val;
        }
    }

    /*~
     * A simple string.
     */
    class String extends Simple
    {
        constructor(name, label) {
            super(name, label);
        }

        value(val) {
            return val;
        }
    }

    /*~
     * A list of strings, as a string with a delimiter, or as an array of strings.
     */
    class StringList extends Simple
    {
        constructor(name, label, delim) {
            super(name, label);
            this.delim = delim;
        }

        value(val) {
            if ( Array.isArray(val) ) {
                return val;
            }
            else if ( 'string' === typeof val ) {
                return val.split(this.delim);
            }
            else {
                throw new Error('String list value neither a string or an array: ' + type);
            }
        }

        // compare unordered
        compare(lhs, rhs) {
            if ( lhs === undefined && rhs === undefined ) {
                return true;
            }
            if ( lhs === undefined || rhs === undefined ) {
                return false;
            }
            if ( lhs.length !== rhs.length ) {
                return false;
            }
            for ( let i = 0; i < lhs.length; ++i ) {
                if ( ! rhs.includes(lhs[i]) ) {
                    return false;
                }
            }
            return true;
        }
    }

    /*~
     * The host properties and config format.
     */
    var host = new ConfigObject('host')
        .add('compose', false, new Ignore())
        .add('comment', false, new Ignore())
        .add('name',    true,  new Ignore())
        .add('apis',    false, new Ignore())
        .add('host',    false, new String('host', 'host'));

    // same base for 3 types of range indexes, below
    function rangeBase() {
        return new ConfigObject(/*'db.range'*/)
            .add('type',      true,  new String('scalar-type',           'type'))
            .add('positions', false, new String('range-value-positions', 'positions'))
            .add('invalid',   false, new   Enum('invalid-values',        'invalid', [ 'ignore', 'reject' ]))
            .add('collation', false, new String('collation',             'collation'))
            .dflt('collation', res => {
                return res['scalar-type'].value === 'string'
                    ? 'http://marklogic.com/collation/'
                    : '';
            });
    }

    /*~
     * The database properties and config format.
     */
    var database = new ConfigObject('database')
        .add('compose',    false, new Ignore())
        .add('comment',    false, new Ignore())
        .add('id',         false, new Ignore())
        .add('name',       true,  new Ignore())
        .add('properties', false, new Ignore())
        .add('forests',    false, new Ignore())
        // .add('schema',   false, new Database('schema-database'))
        // .add('security', false, new Database('security-database'))
        // .add('triggers', false, new Database('triggers-database'))
        .add('schema',   false, new Ignore())
        .add('security', false, new Ignore())
        .add('triggers', false, new Ignore())
        .add('indexes',  false, new ConfigObject(/*'db.indexes'*/)
             .add('namespaces', false, new CouplesAsMap('path-namespace', 'path namespaces', 'prefix', 'namespace-uri'))
             .add('ranges', false, new MultiArray()
                  .add(item => item.path, new ObjectArray('range-path-index', 'path range index', rangeBase()
                       .add('path',      true,  new Multiplexer(new String('path-expression', 'path')))))
                  .add(item => item.parent, new ObjectArray('range-element-attribute-index', 'Attribute range index', rangeBase()
                       .add('name',      true,  new Multiplexer(new String('localname', 'name')))
                       .add('namespace', false, new String('namespace-uri', 'ns'))
                       .add('parent',    true,  new ConfigObject(/*'db.parent'*/ undefined, 'parent')
                            .add('name',      true,  new String('parent-localname',     'parent name'))
                            .add('namespace', false, new String('parent-namespace-uri', 'parent ns'))
                            .dflt('namespace', ''))
                       .dflt('namespace', '')))
                  .add(item => true, new ObjectArray('range-element-index', 'element range index', rangeBase()
                       .add('name',      true,  new Multiplexer(new String('localname', 'name')))
                       .add('namespace', false, new String('namespace-uri', 'ns'))
                       .dflt('namespace', '')))))
        .add('searches', false, new ConfigObject(/*'db.indexes'*/)
             .add('fast', false, new ConfigObject()
                  .add('case-sensitive',            false, new Boolean('fast-case-sensitive-searches',            'fast case sensitive searches'))
                  .add('diacritic-sensitive',       false, new Boolean('fast-diacritic-sensitive-searches',       'fast diacritic sensitive searches'))
                  .add('element-character',         false, new Boolean('fast-element-character-searches',         'fast element character searches'))
                  .add('element-phrase',            false, new Boolean('fast-element-phrase-searches',            'fast element phrase searches'))
                  .add('element-trailing-wildcard', false, new Boolean('fast-element-trailing-wildcard-searches', 'fast element trailing wildcard searches'))
                  .add('element-word',              false, new Boolean('fast-element-word-searches',              'fast element word searches'))
                  .add('phrase',                    false, new Boolean('fast-phrase-searches',                    'fast phrase searches'))
                  .add('reverse',                   false, new Boolean('fast-reverse-searches',                   'fast reverse searches'))))
        .add('lexicons', false, new ConfigObject(/*'db.lexicons'*/)
             .add('uri',        false, new Boolean('uri-lexicon',        'URI lexicon'))
             .add('collection', false, new Boolean('collection-lexicon', 'collection lexicon')));

    /*~
     * The server properties and config format.
     */
    var server = new ConfigObject('server')
        .add('compose',     false, new Ignore())
        .add('comment',     false, new Ignore())
        .add('id',          false, new Ignore())
        .add('name',        true,  new Ignore())
        .add('group',       false, new Ignore())
        .add('properties',  false, new Ignore())
        .add('rest-config', false, new Ignore())
        // .add('content',  true,  new Database('content-database'))
        // .add('modules',  false, new Database('modules-database'))
        .add('content',  true,  new Ignore())
        .add('modules',  false, new Ignore())
        .add('type',     true,  new    Enum('server-type',   'type', [ 'http', 'rest', 'xdbc' ]).freeze())
        .add('port',     true,  new Integer('port',          'port'))
        .add('root',     false, new  String('root',          'root'))
        .add('rewriter', false, new  String('url-rewriter',  'url rewriter'))
        .add('handler',  false, new  String('error-handler', 'error handler'))
        .add('output',   false, new ConfigObject()
             .add('byte-order-mark',             false, new   Enum('output-byte-order-mark',             'output byte order mark',             [ 'yes', 'no', 'default' ]))
             .add('cdata-section-localname',     false, new String('output-cdata-section-localname',     'output cdata section localname'))
             .add('cdata-section-namespace-uri', false, new String('output-cdata-section-namespace-uri', 'output cdata section namespace uri'))
             .add('doctype-public',              false, new String('output-doctype-public',              'output doctype public'))
             .add('doctype-system',              false, new String('output-doctype-system',              'output doctype system'))
             .add('encoding',                    false, new   Enum('output-encoding',                    'output encoding', [
                 'UTF-8', 'ASCII', 'ISO-8859-1', 'ISO-8859-5', 'ISO-8859-6', 'ISO-2022-KR', 'ISO-2022-JP', 'EUC-CN', 'EUC-KR', 'EUC-JP', 'CP932',
                 'CP936', 'CP949', 'CP950', 'CP1252', 'CP1256', 'KOI8-R', 'GB12052', 'GB18030', 'GB2312', 'HZ-GB-2312', 'BIG5', 'BIG5-HKSCS', 'Shift_JIS' ]))
             .add('escape-uri-attributes',       false, new   Enum('output-escape-uri-attributes',       'output escape uri attributes',       [ 'yes', 'no', 'default' ]))
             .add('include-content-type',        false, new   Enum('output-include-content-type',        'output include content type',        [ 'yes', 'no', 'default' ]))
             .add('include-default-attributes',  false, new   Enum('output-include-default-attributes',  'output include default attributes',  [ 'yes', 'no', 'default' ]))
             .add('indent',                      false, new   Enum('output-indent',                      'output indent',                      [ 'yes', 'no', 'default' ]))
             .add('indent-tabs',                 false, new   Enum('output-indent-tabs',                 'output indent tabs',                 [ 'yes', 'no', 'default' ]))
             .add('indent-untyped',              false, new   Enum('output-indent-untyped',              'output indent untyped',              [ 'yes', 'no', 'default' ]))
             .add('media-type',                  false, new String('output-media-type',                  'output media type'))
             .add('method',                      false, new   Enum('output-method',                      'output method', [
                 'default', 'xml', 'xhtml', 'html', 'text', 'sparql-results-json', 'sparql-results-csv', 'n-triples', 'n-quads' ]))
             .add('normalization-form',          false, new   Enum('output-normalization-form',          'output normalization form',          [ 'none', 'NFC', 'NFD', 'NFKD' ]))
             .add('omit-xml-declaration',        false, new   Enum('output-omit-xml-declaration',        'output omit xml declaration',        [ 'yes', 'no', 'default' ]))
             .add('sgml-character-entities',     false, new   Enum('output-sgml-character-entities',     'output sgml character entities',     [ 'none', 'normal', 'math', 'pub' ]))
             .add('standalone',                  false, new   Enum('output-standalone',                  'output standalone',                  [ 'yes', 'no', 'omit' ]))
             .add('undeclare-prefixes',          false, new   Enum('output-undeclare-prefixes',          'output undeclare prefixes',          [ 'yes', 'no', 'default' ]))
             .add('version',                     false, new String('output-version',                     'output version')));

    /*~
     * The source properties and config format.
     */
    var source = new ConfigObject('source')
        .add('compose',     false, new Ignore())
        .add('comment',     false, new Ignore())
        .add('name',        true,  new Ignore())
        .add('filter',      false, new Ignore())
        .add('dir',         false, new     String('dir',        'directory'))
        .add('type',        false, new       Enum('type',       'type',                      [ 'plain', 'rest-src' ]))
        .add('garbage',     false, new StringList('garbage',    'garbage patterns',          /\s*,\s*/))
        .add('include',     false, new StringList('include',    'include patterns',          /\s*,\s*/))
        .add('exclude',     false, new StringList('exclude',    'exclude patterns',          /\s*,\s*/))
        .add('target',      false, new StringList('target',     'target database or server', /\s*,\s*/))
        .add('collections', false, new StringList('collection', 'collections',               /\s*,\s*/))
        .add('permissions', false, new      Perms('permission', 'permissions'));

    /*~
     * The mime properties and config format.
     */
    var mime = new ConfigObject('mime')
        .add('compose',    false, new Ignore())
        .add('comment',    false, new Ignore())
        .add('name',       true,  new Ignore())
        .add('extensions', true,  new StringList('extensions', 'extensions', /\s*,\s*/).freeze())
        .add('format',     true,  new       Enum('format',     'format',     ['binary', 'json', 'text', 'xml']).freeze());

    /*~
     * The role properties and config format.
     *
     * TODO: Add privileges...
     */
    var role = new ConfigObject('role')
        .add('compose',     false, new Ignore())
        .add('comment',     false, new Ignore())
        .add('name',        true,  new     String('role-name',     'role name'))
        .add('desc',        false, new     String('description',   'description'))
        .add('compartment', false, new     String('compartment',   'compartment'))
        .add('permissions', false, new      Perms('permission',    'permissions'))
        .add('roles',       false, new StringList('role',          'roles',          /\s*,\s*/))
        .add('collections', false, new StringList('collection',    'collections',    /\s*,\s*/))
        .add('external',    false, new StringList('external-name', 'external names', /\s*,\s*/))
        .add('privileges',  false, new Privileges('privilege',     'privileges'));

    /*~
     * The user properties and config format.
     */
    var user = new ConfigObject('user')
        .add('compose',     false, new Ignore())
        .add('comment',     false, new Ignore())
        .add('name',        true,  new     String('user-name',   'user name'))
        .add('password',    true,  new     String('password',    'password'))
        .add('desc',        false, new     String('description', 'description'))
        .add('roles',       false, new StringList('role',        'roles',       /\s*,\s*/))
        .add('collections', false, new StringList('collection',  'collections', /\s*,\s*/))
        .add('permissions', false, new      Perms('permission',  'permissions'));

    module.exports = {
        host     : host,
        database : database,
        server   : server,
        source   : source,
        mime     : mime,
        user     : user,
        role     : role,
        Result   : Result
    }
}
)();
