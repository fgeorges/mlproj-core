"use strict";

(function() {

    const fs   = require('fs');
    const path = require('path');
    const xml  = require('xml2js');
    const ctxt = require('../../../src/context');
    const err  = require('../../../src/error');

    class Context extends ctxt.Context
    {
        constructor(config, dry, verbose) {
            super(new Display(), new Platform(), config, dry, verbose);
        }
    }

    class Display extends ctxt.Display
    {
        info(msg) {
            // ignore
        }
    }

    class Platform extends ctxt.Platform
    {
        constructor() {
            super(true, true);
        }

        info(msg) {
            // ignore
        }

        exists(path) {
            return fs.existsSync(path);
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

        projectXml(path) {
            var parser  = new xml.Parser();
            var content = this.read(path);
            var p;
            parser.parseString(content, (err, result) => {
                if ( err ) {
                    throw new Error('Error parsing XML: ' + err + ', at ' + path);
                }
                if ( ! result || ! result.project ) {
                    throw new Error('Bad project.xml, no document or no project element: ' + path);
                }
                if ( ! result.project['$'] || ! result.project['$'].abbrev ) {
                    throw new Error('Bad project.xml, no abbrev: ' + path);
                }
                p = result.project;
            });
            if ( ! p ) {
                // the following page makes it clear it is not async, just using
                // a callback, synchronously:
                // https://github.com/Leonidas-from-XIV/node-xml2js/issues/159#issuecomment-248599477
                throw new Error('Internal error.  Has xml2js become async?  Please report this.');
            }
            let project = {};
            if ( p['$'].abbrev  ) project.abbrev  = p['$'].abbrev;
            if ( p['$'].name    ) project.name    = p['$'].name;
            if ( p['$'].version ) project.version = p['$'].version;
            if ( p.title        ) project.title   = p.title[0];
            return project;
        }
    }

    module.exports = {
        Context  : Context,
        Display  : Display,
        Platform : Platform
    };

}
)();
