"use strict";

(function() {

    const env = require('./environ');
    const err = require('./error');

    class Project
    {
        constructor(ctxt, path) {
            this.ctxt = ctxt;
            this.path = path;
            let pf = this.ctxt.platform;
            // the project own config file
            try {
                let cpath = pf.resolve('xproject/mlproj.json', path);
                let json  = pf.json(cpath);
                // TODO: Add some validation rules? (must exist, format must be there, etc.)
                this.mlproj  = json.mlproj;
                this._config = json.mlproj && json.mlproj.config;
            }
            catch (e) {
                // ignore if file does not exist
                if ( e.code !== 'no-such-file' ) {
                    throw e;
                }
            }
            // the project file
            let ppath = pf.resolve('xproject/project.xml', path);
            let proj  = pf.projectXml(ppath);
            this.name    = proj.name;
            this.abbrev  = proj.abbrev;
            this.version = proj.version;
            this.title   = proj.title;
        }

        configs() {
            let names = this._config ? Object.keys(this._config) : [];
            this.ctxt.configs()
                .filter(n => ! names.includes(n))
                .forEach(n => names.push(n));
            return names;
        }

        config(name) {
            let v = this._config && this._config[name];
            return v !== undefined
                ? v
                : this.ctxt.config(name);
        }

        environ(name, params, force) {
            let e = env.Environ.fromName(this.ctxt, name, this.path, this);
            e.compile(params, force, { code: this.abbrev });
            return e;
        }

        show() {
            const configs = this.configs().map(c => {
                return { name: c, value: this.config(c) };
            });
            this.ctxt.display.project(this.abbrev, configs, this.title, this.name, this.version);
        }
    }

    module.exports = {
        Project : Project
    };
}
)();
