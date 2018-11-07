"use strict";

(function() {

    // For when we will have to come with user-level errors.  Because we will,
    // at some point.
    //
    // const err = require('./error');

    function logHttp(self, verb, params, path) {
        const ctxt = self._command.ctxt;
        if ( ctxt.verbose ) {
            const tag = '[' + ctxt.platform.bold('verbose') + ']';
            const url = path || params.url || params.path;
            ctxt.platform.warn(tag + ' ' + verb + ' to ' + url);
        }
        return ctxt;
    }

    function checkHttp(ctxt, resp) {
        if ( resp.status === 202 ) {
            const body = resp.body.restart;
            if ( ! body ) {
                throw new Error('202 returned NOT for a restart reason?!?');
            }
            const time = Date.parse(body['last-startup'][0].value);
            ctxt.platform.restart(time);
        }
        else if ( resp.status < 200 || resp.status >= 300 ) {
            if ( ctxt.verbose ) {
                const tag = '[' + ctxt.platform.bold('verbose') + ']';
                ctxt.platform.warn(tag + ' Error in the HTTP request, status is: ' + resp.status);
                ctxt.platform.warn(tag + ' Full body content is: ');
                ctxt.platform.warn(resp.body);
            }
        }
        return resp;
    }

    function httpGet(self, params, url) {
        const ctxt = logHttp(self, 'GET', params, url);
        const resp = ctxt.platform.get(params, url);
        return checkHttp(ctxt, resp);
    }

    function httpDelete(self, params, url) {
        const ctxt = logHttp(self, 'DELETE', params, url);
        const resp = ctxt.platform.delete(params, url);
        return checkHttp(ctxt, resp);
    }

    function httpPost(self, params, url, data, type) {
        const ctxt = logHttp(self, 'POST', params, url);
        const resp = ctxt.platform.post(params, url, data, type);
        return checkHttp(ctxt, resp);
    }

    function httpPut(self, params, url, data, type) {
        const ctxt = logHttp(self, 'PUT', params, url);
        const resp = ctxt.platform.post(params, url, data, type);
        return checkHttp(ctxt, resp);
    }

    /*~
     * APIs object for invoking user commands.
     *
     * The command argument is the `RunCommand` object, holding the context,
     * environ and command arguments.
     */
    class Apis
    {
        constructor(cmd) {
            this._command = cmd;
        }

        source(name) {
            const resolved = this._command.environ.substitute(name);
            const src      = this._command.environ.source(resolved);
            // the source set must exist in the environ
            if ( ! src ) {
                throw new Error(`Unknown source set: ${resolved}`
                                + (resolved === name ? `` : ` (${name})`));
            }
            return new Source(this._command, src);
        }

        get(params, url) {
            return httpGet(this, params, url);
        }

        delete(params, url) {
            return httpDelete(this, params, url);
        }

        post(params, url, data, type) {
            return httpPost(this, params, url, data, type);
        }

        put(params, url, data, type) {
            return httpPut(this, params, url, data, type);
        }

        manage() {
            return new Manage(this._command);
        }

        eval(params, evalParams) {
            if ( ! params.path && ! params.url ) {
                params.path = evalParams.database
                    ? '/eval?database=' + evalParams.database
                    : '/eval';
            }
            if ( ! params.api ) {
                params.api = 'rest';
            }
            if ( ! params.type ) {
                params.type = 'application/x-www-form-urlencoded';
            }
            if ( ! params.body ) {
                if ( ! evalParams.xquery && ! evalParams.javascript ) {
                    throw new Error('No code provided to evaluate');
                }
                if ( evalParams.xquery && evalParams.javascript ) {
                    throw new Error('Both XQuery and JavaScript code provided to evaluate');
                }
                params.body = evalParams.xquery
                    ? 'xquery='     + encodeURIComponent(evalParams.xquery)
                    : 'javascript=' + encodeURIComponent(evalParams.javascript);
                if ( evalParams.vars ) {
                    const values = Object.keys(evalParams.vars).map(name => {
                        return `"${name}":${JSON.stringify(evalParams.vars[name])}`
                    });
                    params.body += '&vars=' + encodeURIComponent('{' + values.join(',') + '}');
                }
            }
            const resp = this.post(params);
            if ( resp.status !== 200 ) {
                if ( this._command.ctxt.verbose ) {
                    console.log(`Error on the eval endpoint: ${resp.status}. Response body:`);
                    console.log(resp.body);
                }
                throw new Error(`Error on the eval endpoint: ${resp.status}`);
            }
            // TODO: Parse the multipart result as a sequence (so an array here...)
            return resp.body.toString();
        }
    }

    class Source
    {
        constructor(cmd, src) {
            this._command = cmd;
            this._source  = src;
        }

        files() {
            const paths = [];
            this._source.walk(this._command.ctxt, this._command.ctxt.display, p => paths.push(p));
            return paths;
        }
    }

    class Manage
    {
        constructor(cmd) {
            this._command = cmd;
        }

        _adaptParams(params) {
            if ( ! params.api ) {
                params.api = 'manage';
            }
            return params;
        }

        get(params) {
            this._adaptParams(params);
            return httpGet(this, params);
        }

        delete(params) {
            this._adaptParams(params);
            return httpDelete(this, params);
        }

        post(params, data, type) {
            this._adaptParams(params);
            return httpPost(this, params, null, data, type);
        }

        put(params, data, type) {
            this._adaptParams(params);
            return httpPut(this, params, null, data, type);
        }

        databases() {
            const resp = this.get({ path: '/databases' });
            if ( resp.status !== 200 ) {
                throw new Error(`Error retrieving the database list: ${resp.status}`);
            }
            return resp.body
                ['database-default-list']
                ['list-items']
                ['list-item']
                .map(i => i.nameref);
        }

        database(name) {
            const resolved = this._command.environ.substitute(name);
            const db       = this._command.environ.database(resolved);
            // can use the name of any server, not only these defined in the environ
            const the_name = db ? db.name : resolved;
            return new Database(this._command, the_name);
        }

        forests() {
            const resp = this.get({ path: '/forests' });
            if ( resp.status !== 200 ) {
                throw new Error(`Error retrieving the forest list: ${resp.status}`);
            }
            return resp.body
                ['forest-default-list']
                ['list-items']
                ['list-item']
                .map(i => i.nameref);
        }

        forest(name) {
            const resolved = this._command.environ.substitute(name);
            return new Forest(this._command, resolved);
        }

        servers() {
            const resp = this.get({ path: '/servers' });
            if ( resp.status !== 200 ) {
                throw new Error(`Error retrieving the server list: ${resp.status}`);
            }
            return resp.body
                ['server-default-list']
                ['list-items']
                ['list-item']
                .map(i => i.nameref);
        }

        server(name, group) {
            const resolved = this._command.environ.substitute(name);
            const srv      = this._command.environ.server(resolved);
            // can use the name of any server, not only these defined in the environ
            const the_name = srv ? srv.name : resolved;
            return new Server(this._command, the_name, group);
        }
    }

    class Database
    {
        constructor(cmd, name) {
            this._command = cmd;
            this._name    = cmd.environ.substitute(name);
        }

        _adaptParams(params) {
            if ( ! params.api ) {
                params.api = 'manage';
            }
            params.path = `/databases/${this._name}${params.path || ''}`;
            return params;
        }

        get(params) {
            this._adaptParams(params);
            return httpGet(this, params);
        }

        post(params, data, type) {
            this._adaptParams(params);
            return httpPost(this, params, null, data, type);
        }

        put(params, data, type) {
            this._adaptParams(params);
            return httpPut(this, params, null, data, type);
        }

        remove(arg) {
            const params = {};
            if ( ! arg ) {
                // nothing
            }
            else if ( arg === 'config' ) {
                params.path = '?forest-delete=configuration';
            }
            else if ( arg === 'data' ) {
                params.path = '?forest-delete=data';
            }
            else {
                throw new Error(`Unknown argument to remove() for database ${this._name}: ${arg}`);
            }
            const resp = httpDelete(this, this._adaptParams(params));
            if ( resp.status !== 204 ) {
                throw new Error(`Error deleting the forest: ${this._name} - ${resp.status}`);
            }
            return this;
        }

        properties(body) {
            if ( body === undefined ) {
                const resp = this.get({ path: '/properties' });
                if ( resp.status !== 200 ) {
                    throw new Error(`Error retrieving the database properties: ${this._name} - ${resp.status}`);
                }
                return resp.body;
            }
            else {
                const resp = this.put({ path: '/properties' }, body);
                if ( resp.status !== 202 && resp.status !== 204 ) {
                    throw new Error(`Error setting the database properties: ${this._name} - ${resp.status}`);
                }
                return this;
            }
        }

        forests() {
            return this.properties().forest || [];
        }
    }

    class Forest
    {
        constructor(cmd, name) {
            this._command = cmd;
            this._name    = cmd.environ.substitute(name);
        }

        _adaptParams(params) {
            if ( ! params.api ) {
                params.api = 'manage';
            }
            params.path = `/forests/${this._name}${params.path || ''}`;
            return params;
        }

        get(params) {
            this._adaptParams(params);
            return httpGet(this, params);
        }

        post(params, data, type) {
            this._adaptParams(params);
            return httpPost(this, params, null, data, type);
        }

        put(params, data, type) {
            this._adaptParams(params);
            return httpPut(this, params, null, data, type);
        }

        remove() {
            const params = { path: '?level=full' };
            const resp   = httpDelete(this, this._adaptParams(params));
            if ( resp.status !== 204 ) {
                throw new Error(`Error deleting the forest: ${this._name} - ${resp.status}`);
            }
            return this;
        }

        detach() {
            const resp = this.post({ path: '?state=detach' });
            if ( resp.status === 404 ) {
                throw new Error(`Unknown forest to detach: ${this._name}`);
            }
            if ( resp.status !== 200 ) {
                throw new Error(`Error detaching the forest: ${this._name} - ${resp.status}`);
            }
            return this;
        }

        attach(db) {
            const resp = this.post({ path: `?state=attach&database=${db._name || db}` });
            if ( resp.status === 404 ) {
                throw new Error(`Unknown database or forest to attach: ${this._name} - ${db._name || db}`);
            }
            if ( resp.status !== 200 ) {
                throw new Error(`Error attaching the forest: ${this._name} - ${resp.status}`);
            }
            return this;
        }

        create(param) {
            let body = { "forest-name": this._name };
            if ( param instanceof Database ) {
                body.database = param._name;
            }
            else if ( typeof param === 'string' ) {
                body.database = param;
            }
            else if ( typeof param === 'object' ) {
                body = param;
                body['forest-name'] = this._name;
            }
            else {
                throw new Error('Unknown type of parameter');
            }
            const resp = new Manage(this._command).post({ path: '/forests' }, body);
            if ( resp.status !== 201 ) {
                throw new Error(`Error creating the forest: ${this._name} - ${resp.status}`);
            }
            return this;
        }

        properties(body) {
            if ( body === undefined ) {
                const resp = this.get({ path: '/properties' });
                if ( resp.status !== 200 ) {
                    throw new Error(`Error retrieving the forest properties: ${this._name} - ${resp.status}`);
                }
                return resp.body;
            }
            else {
                const resp = this.put({ path: '/properties' }, body);
                if ( resp.status !== 202 && resp.status !== 204 ) {
                    throw new Error(`Error setting the forest properties: ${this._name} - ${resp.status}`);
                }
                return this;
            }
        }
    }

    class Server
    {
        constructor(cmd, name, group) {
            this._command = cmd;
            this._name    = cmd.environ.substitute(name);
            this._group   = group || 'Default';
        }

        _adaptParams(params) {
            if ( ! params.api ) {
                params.api = 'manage';
            }
            const path = params.path || '';
            params.path =
                '/servers/' + this._name
                + path
                + (path.includes('?') ? '&' : '?')
                + 'group-id=' + this._group;
            return params;
        }

        get(params) {
            this._adaptParams(params);
            return httpGet(this, params);
        }

        post(params, data, type) {
            this._adaptParams(params);
            return httpPost(this, params, null, data, type);
        }

        put(params, data, type) {
            this._adaptParams(params);
            return httpPut(this, params, null, data, type);
        }

        remove(arg) {
            const resp = httpDelete(this, this._adaptParams({}));
            if ( resp.status !== 202 && resp.status !== 204 ) {
                throw new Error(`Error deleting the forest: ${this._name} - ${resp.status}`);
            }
            return this;
        }

        properties(body) {
            if ( body === undefined ) {
                const resp = this.get({ path: '/properties' });
                if ( resp.status !== 200 ) {
                    throw new Error(`Error retrieving the server properties: ${this._name} - ${resp.status}`);
                }
                return resp.body;
            }
            else {
                const resp = this.put({ path: '/properties' }, body);
                if ( resp.status !== 202 && resp.status !== 204 ) {
                    throw new Error(`Error setting the server properties: ${this._name} - ${resp.status}`);
                }
                return this;
            }
        }
    }

    module.exports = {
        Apis : Apis
    }
}
)();
