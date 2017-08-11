var fs   = require('fs');
var uuid = require('uuid');
var http = require('./http');

// create a multipart class to create a buffer out of an array of strings + buffers...

function post(url, data, ctype) {
    var options = {
        body: data,
        headers: {
            "Content-Type": ctype,
            Accept: 'application/json'
        }
    };
    var resp = http.requestAuth('POST', url, options);
    if ( resp.statusCode !== 200 ) {
        throw new Error('Entity not created: ' + (resp.body.errorResponse
                        ? resp.body.errorResponse.message : resp.body));
    }
    console.log('Success!');
    console.log(resp.body.toString());
}

function sample() {
    let mp = new Multipart();
    mp.header('Content-Disposition', 'attachment; filename=/test/new-text.txt');
    mp.body('body');              // string or buffer
    mp.header('Content-Disposition', 'attachment; filename=/test/new-query.xqy');
    mp.body('"body"');
    mp.header('Content-Disposition', 'attachment; filename=/test/new-image.png');
    mp.body(fs.readFileSync('/home/fgeorges/projects/ml/mlproj/mlproj-core/test/projects/simple-chimay/src/rsrc/images/chimay-blue.png'));
    let body  = mp.payload();     // buffer
    let ctype = 'multipart/mixed; boundary=' + mp.boundary;
    return post('http://ml911:8000/v1/documents', body, ctype);
}

const NL = '\r\n';

class Multipart
{
    constructor(boundary) {
        this.boundary = uuid();
        // parts is an array of { headers: string, body: string-or-buffer }
        this.parts    = [];
        this.headers  = [];
    }

    contentType() {
        return 'multipart/mixed; boundary=' + this.boundary;
    }

    header(name, value) {
        this.headers.push(name + ': ' + value);
    }

    body(content) {
        let preamble =
            '--' + this.boundary + NL
            + this.headers.reduce((res, h) => res + h + NL, '')
            + NL;
        this.parts.push({ headers: preamble, body: content });
        this.headers = [];
    }

    payload() {
        let end ='--' + this.boundary + '--' + NL;
        let len =
            this.parts.reduce((res, p) => {
                let hlen = Buffer.byteLength(p.headers);
                let blen = Buffer.byteLength(p.body);
                return res + hlen + blen + 2;
            }, 0)
            + Buffer.byteLength(end);
        let buf = new Buffer(len);
        let pos = 0;
        this.parts.forEach(p => {
            pos += buf.write(p.headers, pos);
            pos += Buffer.isBuffer(p.body)
                ? p.body.copy(buf, pos)
                : buf.write(p.body, pos);
            pos += buf.write(NL, pos);
        });
        buf.write(end, pos);
        return buf;
    }
}

sample();
