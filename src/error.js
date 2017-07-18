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
        var err = new MlprojError('abstract-fun', 'Function ' + name + ' is abstract');
        err.fun = name;
        return err;
    }

    function noSuchFile(path) {
        var err = new MlprojError('no-such-file', 'No such file or directory: ' + path);
        err.path = path;
        return err;
    }

    function noSuchDb(name) {
        var err = new MlprojError('no-such-db', 'No such database: ' + name);
        err.name = name;
        return err;
    }

    function noSuchSrv(name) {
        var err = new MlprojError('no-such-srv', 'No such server: ' + name);
        err.name = name;
        return err;
    }

    function serverNoDb(name, type) {
        var err = new MlprojError('server-no-' + type, 'Server has no ' + type + ' database: ' + name);
        err.server = name;
        return err;
    }

    module.exports = {
        abstractFun : abstractFun,
        noSuchFile  : noSuchFile,
        serverNoDb  : serverNoDb
    };
}
)();
