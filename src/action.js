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

        execute(platform) {
            err.abstractFun('Action.execute');
        }

        toValues() {
            err.abstractFun('Action.toValues');
        }

        fromValues(values) {
            err.abstractFun('Action.fromValues');
        }
    }

    /*~
     * A single one function action.
     */
    class FunAction extends Action
    {
        constructor(msg, fun) {
            super(msg);
            this.fun = fun;
        }

        execute(platform) {
            if ( platform.verbose ) {
                platform.warn('Execute: ' + this.msg);
            }
            return this.fun(platform);
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

        getData(platform) {
            return this.data;
        }

        execute(platform) {
            if ( platform.verbose ) {
                platform.warn('[' + platform.bold('verbose') + '] '
                              + this.verb + ' to ' + this.url);
                if ( this.data && ! this.type) {
                    platform.warn('[' + platform.bold('verbose') + '] Body:');
                    platform.warn(this.data);
                }
            }
            if ( platform.dry && this.verb !== 'GET' ) {
                platform.warn(platform.yellow('→') + ' ' + this.msg);
            }
            else {
                return this.send(platform, this.api, this.url, this.getData(platform));
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

        send(platform, api, url, data) {
            platform.warn(platform.yellow('→') + ' ' + this.msg);
            if ( data ) {
                throw new Error('Data in a GET: ' + url + ', ' + data);
            }
            return platform.get(api, url);
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

        send(platform, api, url, data) {
            platform.warn(platform.yellow('→') + ' ' + this.msg);
            return platform.post(api, url, data, this.type);
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

        send(platform, api, url, data) {
            platform.warn(platform.yellow('→') + ' ' + this.msg);
            return platform.put(api, url, data, this.type);
        }
    }

    /*~~~~~ Management API actions. */

    /*~
     * A Management API GET action.
     */
    class ManageGet extends Get
    {
        constructor(url, msg) {
            super('management', url, msg);
        }
    }

    /*~
     * A Management API POST action.
     */
    class ManagePost extends Post
    {
        constructor(url, data, msg) {
            super('management', url, data, msg);
        }
    }

    /*~
     * A Management API PUT action.
     */
    class ManagePut extends Put
    {
        constructor(url, data, msg) {
            super('management', url, data, msg);
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
            var body    = name && { [name]: value };
            super('/servers/' + srvname + '/properties?group-id=' + group,
                  body,
                  'Update ' + name + ':  \t' + srvname);
        }

        send(platform, api, url, data) {
            var res = super.send(platform, api, url, data);
            if ( res ) {
                // TODO: Do NOT use console.log() directly here...!
                // Use the display instead...
                console.log('MarkLogic is restarting, waiting for it to be back up...');
                platform.restart(res);
            }
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
     * Client API: insert a document.
     *
     * Using this API for inserting docuemnts is deeeaaaad slow.  Especially for
     * *.xq files on the EXPath Console.  No idea why.  So invoke XDBC instead,
     * see below.
     */
    /*
    class DocInsert extends ClientPut
    {
        constructor(db, uri, doc) {
            super('/documents?uri=' + uri + '&database=' + db.name,
                  doc,
                  'Insert document: \t' + uri);
            this.type = 'text/plain';
        }
    }
    */

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
        constructor(db, uri, doc) {
            var name = db && db.name;
            // TODO: Add "perm" parameters.
            // TODO: Add "format" parameter (xml, text, binary)
            super('/insert?uri=' + uri + '&dbname=' + name,
                  doc,
                  'Insert document: \t' + uri);
            // TODO: Should we use something else?  XDBC/XCC is bad (is not!) documented...
            this.type = 'text/plain';
        }

        getData(platform) {
            return platform.read(this.data);
        }
    }

    /*~
     * A list of actions.
     */
    class ActionList
    {
        constructor(platform)
        {
            this.platform = platform;
            this.todo     = [];
            this.done     = [];
            this.error    = null;
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
                    action.execute(this.platform);
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

        summary(skipdone)
        {
            var pf = this.platform;
            if ( ! skipdone && this.done.length ) {
                pf.log(pf.green('Done') + ':');
                this.done.forEach(a => a.display(pf, 'done'));
            }
            if ( this.error ) {
                pf.log(pf.red('Error') + ':');
                this.error.action.display(pf, 'error');
                pf.log(this.error.message);
            }
            if ( this.todo.length ) {
                pf.log(pf.yellow('Not done') + ':');
                this.todo.forEach(a => a.display(pf, 'todo'));
            }
            if ( ! this.done.length && ! this.error && ! this.todo.length ) {
                pf.log('Nothing to do.');
            }
        }
    }

    module.exports = {
        ActionList     : ActionList,
        FunAction      : FunAction,
        ForestList     : ForestList,
        ForestCreate   : ForestCreate,
        ForestAttach   : ForestAttach,
        ForestDetach   : ForestDetach,
        DatabaseProps  : DatabaseProps,
        DatabaseCreate : DatabaseCreate,
        DatabaseUpdate : DatabaseUpdate,
        ServerProps    : ServerProps,
        ServerCreate   : ServerCreate,
        ServerUpdate   : ServerUpdate,
        DocInsert      : DocInsert
    }
}
)();
