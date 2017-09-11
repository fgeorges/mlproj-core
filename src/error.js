"use strict";

(function() {

    class MlprojError extends Error
    {
        constructor(code, msg) {
            super(msg);
            this.name = code;
        }
    }

    function abstractFun(name) {
        let err = new MlprojError('abstract-fun', 'Function ' + name + ' is abstract');
        err.fun = name;
        return err;
    }

    function noSuchFile(path) {
        let err = new MlprojError('no-such-file', 'No such file or directory: ' + path);
        err.path = path;
        return err;
    }

    function invalidJson(reason, path) {
        let msg = 'Invalid JSON: ' + reason;
        if ( path ) {
            msg += ', in ' + path;
        }
        let err = new MlprojError('invalid-json', msg);
        err.reason = reason;
        err.path   = path;
        return err;
    }

    function noSuchDb(name) {
        let err = new MlprojError('no-such-db', 'No such database: ' + name);
        err.name = name;
        return err;
    }

    function noSuchSrv(name) {
        let err = new MlprojError('no-such-srv', 'No such server: ' + name);
        err.name = name;
        return err;
    }

    function serverNoDb(name, type) {
        let err = new MlprojError('server-no-' + type, 'Server has no ' + type + ' database: ' + name);
        err.server = name;
        return err;
    }

    function serverPortUsed(name, port) {
        let err = new MlprojError('server-port-used',
                                  'Port already used (or invalid) for server ' + name + ': ' + port);
        err.server = name;
        err.port   = port;
        return err;
    }

    module.exports = {
        abstractFun    : abstractFun,
        noSuchFile     : noSuchFile,
        invalidJson    : invalidJson,
        noSuchDb       : noSuchDb,
        noSuchSrv      : noSuchSrv,
        serverNoDb     : serverNoDb,
        serverPortUsed : serverPortUsed
    };
}
)();
