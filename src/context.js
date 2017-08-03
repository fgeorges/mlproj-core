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

        source(name) {
            throw err.abstractFun('Display.source');
        }

        mimetype(name) {
            throw err.abstractFun('Display.mimetype');
        }

        project(abbrev, configs, title, name, version) {
            throw err.abstractFun('Display.project');
        }

        environ(envipath, title, desc, host, user, password, params, imports) {
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

        read(path) {
            throw err.abstractFun('Platform.read');
        }

        // TODO: Remove the validate param...
        json(path, _validate) {
            let json = JSON.parse(this.read(path));
            return _validate ? json.mlproj : json;
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

    module.exports = {
        Context  : Context,
        Display  : Display,
        Platform : Platform
    };
}
)();
