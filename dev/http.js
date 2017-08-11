(function() {

    var request = require('sync-request')
    var crypto  = require('crypto')

    function requestAuth(method, url, options) {
        const md5 = (name, str) => {
            return crypto.createHash('md5').update(str).digest('hex');
        };
        const parseDigest = header => {
            if ( ! header || header.slice(0, 7) !== 'Digest ' ) {
                throw new Error('Expect WWW-Authenticate for digest, got: ' + header);
            }
            return header.substring(7).split(/,\s+/).reduce((obj, s) => {
                var parts = s.split('=')
                obj[parts[0]] = parts[1].replace(/"/g, '')
                return obj
            }, {});
        };
        const renderDigest = params => {
            const attr = (key, quote) => {
                if ( params[key] ) {
                    attrs.push(key + '=' + quote + params[key] + quote);
                }
            };
            var attrs = [];
            attr('username',  '"');
            attr('realm',     '"');
            attr('nonce',     '"');
            attr('uri',       '"');
            attr('algorithm', '');
            attr('response',  '"');
            attr('opaque',    '"');
            attr('qop',       '');
            attr('nc',        '');
            attr('cnonce',    '"');
            return 'Digest ' + attrs.join(', ');
        };
        const auth = header => {
            var params = parseDigest(header);
            if ( ! params.qop ) {
                throw new Error('Not supported: qop is unspecified');
            }
            else if ( params.qop === 'auth-int' ) {
                throw new Error('Not supported: qop is auth-int');
            }
            else if ( params.qop === 'auth' ) {
                // keep going...
            }
            else {
                if ( params.qop.split(/,/).includes('auth') ) {
                    // keep going...
                    params.qop = 'auth';
                }
                else {
                    throw new Error('Not supported: qop is ' + params.qop);
                }
            }
            // TODO: Handle NC and CNONCE
            var nc     = '00000001';
            var cnonce = '4f1ab28fcd820bc5';
            var ha1    = md5('ha1', creds[0] + ':' + params.realm + ':' + creds[1]);

            // TODO: `path` not properly provisionned?!?
            // How could it work?!? (path refers to require('path'), here)
            // Get it from `url`? (from and after first '/'..., or 3d, because of http://...?)
            var path = 'TODO: ...';

            var ha2    = md5('ha2', method + ':' + path);
            var resp   = md5('response', [ha1, params.nonce, nc, cnonce, params.qop, ha2].join(':'));
            var auth   = {
                username:  creds[0],
                realm:     params.realm,
                nonce:     params.nonce,
                uri:       path,
                qop:       params.qop,
                response:  resp,
                nc:        nc,
                cnonce:    cnonce,
                opaque:    params.opaque,
                algorithm: params.algorithm
            };
            return renderDigest(auth);
        };
        var resp  = request(method, url, options);
        var i     = 0;
        var creds = ['admin', 'admin'];
        while ( resp.statusCode === 401 ) {
            if ( ++i > 3 ) {
                throw new Error('Too many authentications failed: ' + url);
            }
            if ( ! options.headers ) {
                options.headers = {};
            }
            options.headers.authorization = auth(resp.headers['www-authenticate']);
            resp = request(method, url, options);
        }
        return resp;
    }

    module.exports = {
        requestAuth : requestAuth
    };

}
)();
