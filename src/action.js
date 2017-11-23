"use strict";

(function() {

    const err = require('./error');

    /*~~~~~ Base actions. */

    /*~
     * A single one, abstract action.
     */
    class Action
    {
        constructor(msg) {
            this.msg = msg;
        }

        display(platform, status) {
            var start = status === 'done'
                ? platform.green('✓')      // success
                : status === 'todo'
                ? platform.yellow('✗')     // not done
                : platform.red('✗');       // error
            platform.log(start + ' ' + this.msg);
        }

        execute(ctxt) {
            throw err.abstractFun('Action.execute');
        }

        toValues() {
            throw err.abstractFun('Action.toValues');
        }

        fromValues(values) {
            throw err.abstractFun('Action.fromValues');
        }
    }

    /*~
     * A single one function action.
     */
    class FunAction extends Action
    {
        constructor(msg, fun, cmd) {
            super(msg);
            this.fun = fun;
            this.cmd = cmd;
        }

        execute(ctxt) {
            if ( ctxt.verbose ) {
                ctxt.platform.warn('Execute: ' + this.msg);
            }
            ctxt.platform.warn(ctxt.platform.yellow('→') + ' ' + this.msg);
            if ( ! ctxt.dry ) {
                return this.fun(ctxt);
            }
        }
    }

    /*~
     * A single one HTTP action.
     */
    class HttpAction extends Action
    {
        constructor(api, url, verb, msg, data) {
            super(msg);
            this.api  = api;
            this.url  = url;
            this.verb = verb;
            this.data = data;
        }

        toValues() {
            var res = {
                type : this.constructor.name,
                msg  : this.msg,
                api  : this.api,
                url  : this.url,
                verb : this.verb
            };
            if ( this.data && typeof this.data === 'string' ) {
                res.data = this.data;
            }
            else if ( this.data ) {
                res.data = JSON.stringify(this.data);
                res.json = true;
            }
            return res;
        }

        fromValues(values) {
            this.msg  = values.msg;
            this.api  = values.api;
            this.url  = values.url;
            this.verb = values.verb;
            if ( values.json ) {
                this.data = JSON.parse(values.data);
            }
            else {
                this.data = values.data;
            }
        }

        getData(ctxt) {
            return this.data;
        }

        connect(api) {
            return {
                api: api
            };
        }

        execute(ctxt) {
            if ( ctxt.verbose ) {
                ctxt.platform.warn('[' + ctxt.platform.bold('verbose') + '] '
                                   + this.verb + ' to ' + this.url);
                if ( this.data && ! this.type ) {
                    ctxt.platform.warn('[' + ctxt.platform.bold('verbose') + '] Body:');
                    ctxt.platform.warn(this.data);
                }
            }
            if ( ! ctxt.dry || this.verb !== 'GET' ) {
                ctxt.platform.warn(ctxt.platform.yellow('→') + ' ' + this.msg);
            }
            if ( ! ctxt.dry || this.verb === 'GET' ) {
                return this.send(ctxt, this.api, this.url, this.getData(ctxt));
            }
        }
    }

    /*~~~~~ HTTP verb actions. */

    /*~
     * A GET action.
     */
    class Get extends HttpAction
    {
        constructor(api, url, msg) {
            super(api, url, 'GET', msg);
        }

        send(ctxt, api, url, data) {
            if ( data ) {
                throw new Error('Data in a GET: ' + url + ', ' + data);
            }
            let resp = ctxt.platform.get(this.connect(api), url);
            if ( resp.status === 200 ) {
                return this.onOk(resp);
            }
            else if ( resp.status === 404 ) {
                return;
            }
            else {
                throw new Error('Error retrieving entity: ' + (resp.body.errorResponse
                                ? resp.body.errorResponse.message : resp.body));
            }
        }

        onOk(resp) {
            return resp.body;
        }
    }

    /*~
     * A POST action.
     */
    class Post extends HttpAction
    {
        constructor(api, url, data, msg) {
            super(api, url, 'POST', msg, data);
        }

        send(ctxt, api, url, data) {
            let resp = ctxt.platform.post(this.connect(api), url, data, this.type);
            if ( resp.status === 200 || resp.status === 201 || resp.status === 204 ) {
                // nothing
            }
            // when operation needs a server restart
            else if ( resp.status === 202 ) {
                let body = resp.body.restart;
                if ( ! body ) {
                    throw new Error('202 returned NOT for a restart reason?!?');
                }
                let time = Date.parse(body['last-startup'][0].value);
                ctxt.platform.restart(time);
            }
            else {
                throw new Error('Entity not created: ' + (resp.body.errorResponse
                                ? resp.body.errorResponse.message : resp.body));
            }
        }
    }

    /*~
     * A PUT action.
     */
    class Put extends HttpAction
    {
        constructor(api, url, data, msg) {
            super(api, url, 'PUT', msg, data);
        }

        send(ctxt, api, url, data) {
            let resp = ctxt.platform.put(this.connect(api), url, data, this.type);
            // XDBC PUT /insert returns 200
            if ( resp.status === 200 || resp.status === 201 || resp.status === 204 ) {
                // nothing
            }
            // when operation needs a server restart
            else if ( resp.status === 202 ) {
                let body = resp.body.restart;
                if ( ! body ) {
                    throw new Error('202 returned NOT for a restart reason?!?');
                }
                let time = Date.parse(body['last-startup'][0].value);
                ctxt.platform.restart(time);
            }
            else {
                throw new Error('Entity not updated: ' + (resp.body.errorResponse
                                ? resp.body.errorResponse.message : resp.body));
            }
        }
    }

    /*~
     * REST server: retrieve server properties.
     */
    class ServerRestProps extends Get
    {
        constructor(srv, port) {
            var name = srv && srv.name;
            super(null,
                  '/v1/config/properties',
                  'Retrieve REST server props: \t' + name);
            this.port = port;
        }

        connect(api) {
            return {
                port: this.port
            };
        }
    }

    /*~
     * REST server: update server properties.
     */
    class ServerRestUpdate extends Put
    {
        constructor(srv, body, port) {
            var name = srv && srv.name;
            super(null,
                  '/v1/config/properties',
                  body,
                  'Update REST server props: \t' + name);
            this.port = port;
        }

        connect(api) {
            return {
                port: this.port
            };
        }
    }

    /*~
     * REST server: deploy service or transform.
     */
    class ServerRestDeploy extends Put
    {
        constructor(kind, name, path, type, port) {
            super(null,
                  '/v1/config/' + kind + '/' + name,
                  path,
                  'Deploy REST ' + kind + ': \t' + name);
            this.type = type;
            this.port = port;
        }

        connect(api) {
            return {
                port: this.port,
                type: this.type
            };
        }

        getData(ctxt) {
            return ctxt.platform.read(this.data);
        }
    }

    /*~~~~~ REST API actions. */

    /*~
     * A REST API GET action.
     */
    class RestGet extends Get
    {
        constructor(url, msg) {
            super('rest', url, msg);
        }
    }

    /*~
     * A REST API POST action.
     */
    class RestPost extends Post
    {
        constructor(url, data, msg) {
            super('rest', url, data, msg);
        }
    }

    /*~
     * REST API: create a server.
     */
    class ServerRestCreate extends RestPost
    {
        constructor(srv, body) {
            var name = srv && srv.name;
            super('',
                  body,
                  'Create REST server: \t\t' + name);
        }
    }

    /*~
     * REST API: get server creation properties.
     */
    class ServerRestCreationProps extends RestGet
    {
        constructor(srv) {
            var name = srv && srv.name;
            super('/' + name,
                  'Retrieve REST config props: \t' + name);
        }

        /*
         * There is a bug on GET /v1/rest-apis/{name}, where it returns Content-
         * Type as text/plain instead of application/json.  At least MarkLogic
         * 9.1.1: http://marklogic.markmail.org/thread/7mstpjktts6j56pq.
         */
        onOk(resp) {
            if ( resp.headers
                 && resp.headers['content-type']
                 // TODO: Parse it properly, e.g. "text/plain; charset=UTF-8"
                 && resp.headers['content-type'].startsWith('text/plain') ) {
                return JSON.parse(resp.body);
            }
            else {
                return resp.body;
            }
        }
    }

    /*~~~~~ Admin API actions. */

    /*~
     * An Admin API GET action.
     */
    class AdminGet extends Get
    {
        constructor(url, msg) {
            super('admin', url, msg);
        }
    }

    /*~
     * An Admin API POST action.
     */
    class AdminPost extends Post
    {
        constructor(url, data, msg) {
            super('admin', url, data, msg);
        }
    }

    /*~
     * An Admin API PUT action.
     */
    class AdminPut extends Put
    {
        constructor(url, data, msg) {
            super('admin', url, data, msg);
        }
    }

    /*~
     * Admin API: init host.
     */
    class AdminInit extends AdminPost
    {
        // TOSO: Support licensee and license-key...
        constructor(key, licensee) {
            let body = {};
            if ( key ) {
                body['license-key'] = key;
            }
            if ( licensee ) {
                body['licensee'] = licensee;
            }
            super('/init', body, 'Initialize host');
        }

        send(ctxt, api, url, data) {
            var res = super.send(ctxt, api, url, data);
            if ( res ) {
                // TODO: Do NOT use console.log() directly here...!
                // Use the display instead...
                console.log('MarkLogic is restarting, waiting for it to be back up...');
                ctxt.platform.restart(res);
            }
        }
    }

    /*~
     * Admin API: instance admin.
     */
    class AdminInstance extends AdminPost
    {
        constructor(user, pwd) {
            super('/instance-admin',
                  { "admin-username": user, "admin-password": pwd },
                  'Set admin username and password');
        }
    }

    /*~~~~~ Management API actions. */

    /*~
     * A Management API GET action.
     */
    class ManageGet extends Get
    {
        constructor(url, msg) {
            super('manage', url, msg);
        }
    }

    /*~
     * A Management API POST action.
     */
    class ManagePost extends Post
    {
        constructor(url, data, msg) {
            super('manage', url, data, msg);
        }
    }

    /*~
     * A Management API PUT action.
     */
    class ManagePut extends Put
    {
        constructor(url, data, msg) {
            super('manage', url, data, msg);
        }
    }

    /*~
     * Management API: list all forests.
     */
    class ForestList extends ManageGet
    {
        constructor() {
            super('/forests', 'Retrieve forests');
        }
    }

    /*~
     * Management API: create a forest.
     */
    class ForestCreate extends ManagePost
    {
        constructor(forest) {
            var name = forest && forest.name;
            var db   = forest && forest.db && forest.db.name;
            super('/forests',
                  { "forest-name": name, "database": db },
                  'Create forest:  \t\t' + name);
        }
    }

    /*~
     * Management API: attach a forest.
     */
    class ForestAttach extends ManagePost
    {
        constructor(forest) {
            var name = forest && forest.name;
            var db   = forest && forest.db && forest.db.name;
            super('/forests/' + name + '?state=attach&database=' + db,
                  null,
                  'Attach forest:  \t\t' + name);
        }
    }

    /*~
     * Management API: detach a forest.
     */
    class ForestDetach extends ManagePost
    {
        constructor(forest) {
            var name = forest && forest.name;
            super('/forests/' + name + '?state=detach',
                  null,
                  'Detach forest:  \t\t' + name);
        }
    }

    /*~
     * Management API: retrieve properties of a database.
     */
    class DatabaseProps extends ManageGet
    {
        constructor(db) {
            var name = db && db.name;
            super('/databases/' + name + '/properties',
                  'Retrieve database props: \t' + name);
        }
    }

    /*~
     * Management API: create a database.
     */
    class DatabaseCreate extends ManagePost
    {
        constructor(db, body) {
            var name = db && db.name;
            super('/databases',
                  body,
                  'Create database: \t\t' + name);
        }
    }

    /*~
     * Management API: update a database property.
     */
    class DatabaseUpdate extends ManagePut
    {
        constructor(db, name, value) {
            var dbname = db && db.name;
            var body   = name && { [name]: value };
            super('/databases/' + dbname + '/properties',
                  body,
                  'Update ' + name + ':  \t' + dbname);
        }
    }

    /*~
     * Management API: retrieve properties of a server.
     */
    class ServerProps extends ManageGet
    {
        constructor(srv) {
            var group = srv && srv.group;
            var name  = srv && srv.name;
            super('/servers/' + name + '/properties?group-id=' + group,
                  'Retrieve server props: \t' + name);
        }
    }

    /*~
     * Management API: create a server.
     */
    class ServerCreate extends ManagePost
    {
        constructor(srv, body) {
            var group = srv && srv.group;
            var name  = srv && srv.name;
            super('/servers?group-id=' + group,
                  body,
                  'Create server: \t\t' + name);
            this.name = name;
            this.port = body && body.port;
        }

        send(ctxt, api, url, data) {
            try {
                super.send(ctxt, api, url, data);
            }
            catch ( e ) {
                const msg    = e.message;
                const code   = 'MANAGE-INVALIDPAYLOAD';
                const phrase = 'Port is currently in use';
                if ( msg.includes(code) && msg.endsWith(phrase) ) {
                    throw err.serverPortUsed(this.name, this.port);
                }
                else {
                    throw e;
                }
            }
        }
    }

    /*~
     * Management API: update a server property.
     */
    class ServerUpdate extends ManagePut
    {
        constructor(srv, name, value) {
            var group   = srv && srv.group;
            var srvname = srv && srv.name;
            var body    = name;
            var what    = 'properties';
            if ( typeof name !== 'object' ) {
                body = name && { [name]: value };
                what = name;
            }
            super('/servers/' + srvname + '/properties?group-id=' + group,
                  body,
                  'Update ' + what + ':  \t\t' + srvname);
            this.name = srvname;
            this.port = body && body.port;
        }

        send(ctxt, api, url, data) {
            try {
                super.send(ctxt, api, url, data);
            }
            catch ( e ) {
                const msg    = e.message;
                const code   = 'ADMIN-INVALIDPORT';
                const phrase = 'is not valid or bindable';
                if ( msg.includes(code) && msg.endsWith(phrase) ) {
                    throw err.serverPortUsed(this.name, this.port);
                }
                else {
                    throw e;
                }
            }
        }
    }

    /*~
     * Management API: retrieve properties of a MIME type.
     */
    class MimeProps extends ManageGet
    {
        constructor(mime) {
            var name = mime && mime.name;
            super('/mimetypes/' + name + '/properties',
                  'Retrieve mime props: \t' + name);
        }
    }

    /*~
     * Management API: create a MIME type.
     */
    class MimeCreate extends ManagePost
    {
        constructor(mime, body) {
            var name = mime && mime.name;
            super('/mimetypes',
                  body,
                  'Create mime: \t\t' + name);
        }
    }

    /*~~~~~ Client API actions. */

    /*~
     * A Client API GET action.
     */
    class ClientGet extends Get
    {
        constructor(url, msg) {
            super('client', url, msg);
        }
    }

    /*~
     * A Client API POST action.
     */
    class ClientPost extends Post
    {
        constructor(url, data, msg) {
            super('client', url, data, msg);
        }
    }

    /*~
     * A Client API PUT action.
     */
    class ClientPut extends Put
    {
        constructor(url, data, msg) {
            super('client', url, data, msg);
        }
    }

    /*~
     * Client API: insert several documents.
     */
    class MultiDocInsert extends ClientPost
    {
        /*~
         * The parameter `docs` is an array of the form:
         *
         *     [{uri:'/uri/to/use.xml', path:'/path/on/fs/file.xml'}, {uri:'', path:''}, ...]
         */
        constructor(db, docs) {
            var name = db   && db.name;
            var len  = docs && (docs.count || docs.length);
            // make a copy
            var copy = docs && docs.slice();
            super('/documents?database=' + name,
                  copy,
                  'Insert documents: \t\t' + len + ' document' + (len === 1 ? '' : 's'));
        }

        getData(ctxt) {
            this.boundary = ctxt.platform.boundary();
            this.type     = 'multipart/mixed; boundary=' + this.boundary;
            let res = ctxt.platform.multipart(this.boundary, this.data);
            this.msg += ', for ' + (res.length / (1024*1024)).toFixed(3) + ' Mo';
            return res;
        }
    }

    /*~~~~~ XDBC actions. */

    /*~
     * An XDBC PUT action.
     */
    class XdbcPut extends Put
    {
        constructor(url, data, msg) {
            super('xdbc', url, data, msg);
        }
    }

    /*~
     * XDBC: insert a document.
     */
    class DocInsert extends XdbcPut
    {
        constructor(db, uri, path) {
            var name = db && db.name;
            // TODO: Add "perm" parameters.
            // TODO: Add "format" parameter (xml, text, binary)
            super('/insert?uri=' + uri + '&dbname=' + name,
                  path,
                  'Insert document: \t' + uri);
            // TODO: Should we use something else?  XDBC/XCC is badly (is not!) documented...
            this.type = 'text/plain';
        }

        getData(ctxt) {
            return ctxt.platform.read(this.data);
        }
    }

    /*~
     * A list of actions.
     */
    class ActionList
    {
        constructor(ctxt)
        {
            this.ctxt  = ctxt;
            this.todo  = [];
            this.done  = [];
            this.error = null;
        }

        add(a)
        {
            this.todo.push(a);
        }

        execute()
        {
            var action;
            try {
                while ( action = this.todo.shift() ) {
                    action.execute(this.ctxt);
                    this.done.push(action);
                }
            }
            catch (err) {
                this.error = {
                    action  : action,
                    message : err.message,
                    error   : err
                };
            }
        }
    }

    module.exports = {
        ActionList              : ActionList,
        Action                  : Action,
        FunAction               : FunAction,
        AdminInit               : AdminInit,
        AdminInstance           : AdminInstance,
        ForestList              : ForestList,
        ForestCreate            : ForestCreate,
        ForestAttach            : ForestAttach,
        ForestDetach            : ForestDetach,
        DatabaseProps           : DatabaseProps,
        DatabaseCreate          : DatabaseCreate,
        DatabaseUpdate          : DatabaseUpdate,
        ServerProps             : ServerProps,
        ServerCreate            : ServerCreate,
        ServerUpdate            : ServerUpdate,
        ServerRestProps         : ServerRestProps,
        ServerRestCreate        : ServerRestCreate,
        ServerRestUpdate        : ServerRestUpdate,
        ServerRestCreationProps : ServerRestCreationProps,
        ServerRestDeploy        : ServerRestDeploy,
        MimeProps               : MimeProps,
        MimeCreate              : MimeCreate,
        MultiDocInsert          : MultiDocInsert,
        DocInsert               : DocInsert
    }
}
)();
