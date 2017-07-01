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
        throw err;
    }

    function serverNoDb(name, type) {
        var err = new MlprojError('server-no-' + type, 'Server has no ' + type + ' database: ' + name);
        err.server = name;
        throw err;
    }

    module.exports = {
        abstractFun : abstractFun,
        serverNoDb  : serverNoDb
    };
}
)();
