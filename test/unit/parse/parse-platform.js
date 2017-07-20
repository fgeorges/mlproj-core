"use strict";

(function() {

    const fs   = require('fs');
    const path = require('path');
    const s    = require('../../../src/space');
    const err  = require('../../../src/error');

    class Platform extends s.Platform
    {
        constructor() {
            super(true, true);
        }

        read(path) {
            try {
                return fs.readFileSync(path, 'utf8');
            }
            catch (e) {
                if ( e.code === 'ENOENT' ) {
                    throw err.noSuchFile(path);
                }
                else {
                    throw e;
                }
            }
        }

        resolve(href, base) {
            if ( ! base ) {
                base = '.';
            }
            return path.resolve(base, href);
        }

        info(msg) {
            // ignore
        }
    }

    module.exports = {
        Platform : Platform
    };

}
)();
