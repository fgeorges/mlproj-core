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
        throw new MlprojError('abstract-fun', 'Function ' + name + ' is abstract');
    }

    function serverNoDb(name, type) {
        throw new MlprojError('server-no-' + type, 'Server has no ' + type + ' database: ' + name);
    }

    module.exports = {
        abstractFun : abstractFun,
        serverNoDb  : serverNoDb
    };
}
)();
