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
            return this.mlproj[name];
        }

        configs() {
            return this.mlproj ? Object.keys(this.mlproj) : [];
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
            this.verbose  = verbose;
        }

        database(name, id, schema, security, triggers, forests, props) {
            throw err.abstractFun('Display.database');
        }

        server(name, id, group, content, modules, props) {
            throw err.abstractFun('Display.server');
        }

        source(name, props) {
            throw err.abstractFun('Display.source');
        }

        mimetype(name, props) {
            throw err.abstractFun('Display.mimetype');
        }

        project(abbrev, configs, title, name, version) {
            throw err.abstractFun('Display.project');
        }

        environ(envipath, title, desc, host, user, password, params, apis, imports) {
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
     * Utility interface to abstract platform-dependent functionalities.
     */
    class Platform
    {
        constructor(cwd) {
            this.cwd = cwd;
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

        url(api, url) {
            // set in Environ ctor, find a nicer way to pass the info
            if ( ! this.environ ) {
                throw new Error('No environ set on the platform for host');
            }
            var host = this.environ.param('@host');
            if ( ! host ) {
                throw new Error('No host in environ');
            }
            var decl   = this.environ.api(api);
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
