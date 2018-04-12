"use strict";

(function() {

    // For when we will have to come with user-level errors.  Because we will,
    // at some point.
    //
    // const err = require('./error');

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
            return this._command.ctxt.platform.get(params, url);
        }

        post(params, url, data, type) {
            return this._command.ctxt.platform.post(params, url, data, type);
        }

        put(params, url, data, type) {
            return this._command.ctxt.platform.put(params, url, data, type);
        }

        manage() {
            return new Manage(this._command);
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
        }

        get(params, url) {
            this._adaptParams(params);
            return this._command.ctxt.platform.get(params, url);
        }

        post(params, url, data, type) {
            this._adaptParams(params);
            return this._command.ctxt.platform.post(params, url, data, type);
        }

        put(params, url, data, type) {
            this._adaptParams(params);
            return this._command.ctxt.platform.put(params, url, data, type);
        }

        databases() {
            const resp = this.get({ path: '/databases' });
            if ( resp.status !== 200 ) {
                throw new Error('Error retrieving the database list: %s', resp.status);
            }
            return resp.body
                ['database-default-list']
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

    class Server
    {
        constructor(cmd, name, group) {
            this._command = cmd;
            this._name    = name;
            this._group   = group || 'Default';
        }

        _adaptParams(params) {
            if ( ! params.api ) {
                params.api = 'manage';
            }
            params.path =
                '/servers/' + this._name
                + params.path
                + (params.path.includes('?') ? '&' : '?')
                + 'group-id=' + this._group;
        }

        get(params, url) {
            this._adaptParams(params);
            return this._command.ctxt.platform.get(params, url);
        }

        post(params, url, data, type) {
            this._adaptParams(params);
            return this._command.ctxt.platform.post(params, url, data, type);
        }

        put(params, url, data, type) {
            this._adaptParams(params);
            return this._command.ctxt.platform.put(params, url, data, type);
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
                const resp = this.put({ path: '/properties' }, undefined, body);
                if ( resp.status === 202 ) {
                    const body = resp.body.restart;
                    if ( ! body ) {
                        throw new Error('202 returned NOT for a restart reason?!?');
                    }
                    const time = Date.parse(body['last-startup'][0].value);
                    ctxt.platform.restart(time);
                }
                else if ( resp.status !== 204 ) {
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
