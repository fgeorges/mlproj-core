"use strict";

(function() {

    const err = require('./error');

    class Context
    {
        constructor(display, platform, config, dry, verbose) {
            this.display  = display;
            this.platform = platform;
            this.mlproj   = config && config.config;
            this.connect  = config && config.connect;
            this.dry      = dry;
            this.verbose  = verbose;
        }

        config(name) {
            return this.mlproj && this.mlproj[name];
        }

        configs() {
            return this.mlproj ? Object.keys(this.mlproj) : [];
        }

        coreVersion() {
            return this.platform.corePackage().version;
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
        constructor(verbose) {
            this.verbose = verbose;
        }

        database(name, id, schema, security, triggers, forests, props) {
            throw err.abstractFun('Display.database');
        }

        sysDatabase(name) {
            throw err.abstractFun('Display.sysDatabase');
        }

        server(name, id, type, group, content, modules, props) {
            throw err.abstractFun('Display.server');
        }

        source(name, props) {
            throw err.abstractFun('Display.source');
        }

        mimetype(name, props) {
            throw err.abstractFun('Display.mimetype');
        }

        role(props) {
            throw err.abstractFun('Display.role');
        }

        user(props) {
            throw err.abstractFun('Display.user');
        }

        project(abbrev, configs, title, name, version) {
            throw err.abstractFun('Display.project');
        }

        environ(envipath, title, desc, host, user, password, params, apis, commands, imports) {
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

        error(err) {
            throw err.abstractFun('Display.error');
        }
    }

    /*~
     * Utility interface to abstract platform-dependent functionalities.
     */
    class Platform
    {
        constructor(cwd) {
            this.cwd = cwd;
        }

        corePackage() {
            throw err.abstractFun('Platform.corePackage');
        }

        newMinimatch(pattern, options) {
            throw err.abstractFun('Platform.newMinimatch');
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

        read(path, encoding) {
            throw err.abstractFun('Platform.read');
        }

        json(path, encoding) {
            let text = this.read(path, encoding || 'utf8');
            try {
                return JSON.parse(text);
            }
            catch ( e ) {
                if ( e instanceof SyntaxError ) {
                    throw err.invalidJson(e.message, path);
                }
                else {
                    throw e;
                }
            }
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

        url(params, url) {
            let environ = () => {
                // set in Environ ctor, find a nicer way to pass the info
                if ( ! this.environ ) {
                    throw new Error('No environ set on the platform');
                }
                return this.environ;
            };
            if ( params.url ) {
                return params.url;
            }
            let host = params.host || environ().param('@host');
            if ( ! host ) {
                throw new Error('No host in environ');
            }
            let ssl;
            let port;
            let path;
            if ( params.api ) {
                let api = environ().api(params.api);
                ssl  = params.ssl === undefined ? api.ssl : params.ssl;
                port = params.port || api.port;
                path = api.root + (url || params.path || '');
            }
            else {
                ssl  = params.ssl;
                port = params.port;
                path = url || params.path || '/';
            }
            let res = (ssl ? 'https' : 'http') + '://' + host + ':' + port + path;
            return res;
        }

        get(params, url) {
            throw err.abstractFun('Platform.get');
        }

        post(params, url, data, type) {
            throw err.abstractFun('Platform.post');
        }

        put(params, url, data, type) {
            throw err.abstractFun('Platform.put');
        }

        // parts is [ {uri,path}, {uri,path}, ... ]
        multipart(parts) {
            throw err.abstractFun('Platform.multipart');
        }

        restart(last) {
            throw err.abstractFun('Platform.restart');
        }

        exists(path) {
            throw err.abstractFun('Platform.exists');
        }

        isDirectory(path) {
            throw err.abstractFun('Platform.isDirectory');
        }

        dirChildren(path) {
            throw err.abstractFun('Platform.dirChildren');
        }
    }

    module.exports = {
        Context  : Context,
        Display  : Display,
        Platform : Platform
    };
}
)();
