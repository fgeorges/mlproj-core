'use strict'

var uuid = require('uuid')
var fs   = require('fs')
var http = require('./http')

function multipart(options)
{
    let boundary = getBoundary(options);
    return {
        contentType: setContentType(options, boundary),
        body: build(options, boundary)
    };
}

function getBoundary(options)
{
    let header   = options.contentType;
    //let boundary = options.boundary || uuid();
    let boundary = options.boundary || 'kdhbfh..1.2.3.4.5..df.dfdfkyhjd.ff';
    if ( header && header.indexOf('boundary') !== -1 ) {
        boundary = header.replace(/.*boundary=([^\s;]+).*/, '$1');
    }
    return boundary;
}

function setContentType(options, boundary)
{
    let header = options.contentType;
    if ( ! header ) {
        header = 'multipart/mixed; boundary=' + boundary;
    }
    if ( header.indexOf('multipart') === -1 ) {
        header = 'multipart/mixed; ' + header;
    }
    if ( header.indexOf('boundary') === -1 ) {
        header = header + '; boundary=' + boundary;
    }
    return header;
}

function line()
{
    let res = '';
    for ( let arg of arguments ) {
        res += arg;
    }
    res += '\r\n';
    return res;
}

function build(options, boundary)
{
    var body = '';
    options.multipart.forEach(part => {
        var preamble = line('--', boundary);
        var headers  = '';
        Object.keys(part).forEach(key => {
            if ( key !== 'body' ) {
                headers += line(key, ': ', part[key]);
            }
        });
        body += line(preamble, headers);
        body += line(part.body);
        //body += line();
    });
    body += line('--', boundary, '--');
    return body;
}

// Test sending multiple documents to the Client API, via a Multipart POST to
// /v1/documents, and their relation with the registered MIME types.  In order
// to do so, send 8 documents: 1 text, 1 XML, 1 JSON and 1 binary, each with the
// proper Content-Type, once with .xqy, once with .xxx.

function post(url, data) {
    var options = {
        body: data.body,
        headers: {
            "Content-Type": data.contentType,
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

var result = multipart({ multipart: [{
    "Content-Type": 'text/plain',
    "Content-Disposition": 'attachment; filename=/test/file-text.xqy',
    body: 'Hello, world!'
}, {
    "Content-Type": 'application/xml',
    "Content-Disposition": 'attachment; filename=/test/file-xml.xqy',
    body: '<hello>world!</hello>'
}, {
    "Content-Type": 'application/json',
    "Content-Disposition": 'attachment; filename=/test/file-json.xqy',
    body: JSON.stringify({ hello: 'world!' })
}, {
    "Content-Type": 'application/octet-stream',
    "Content-Disposition": 'attachment; filename=/test/file-bin.xqy',
    body: String.fromCharCode(1, 0, 2, 4)
}, {
    "Content-Type": 'text/plain',
    "Content-Disposition": 'attachment; filename=/test/file-text.xxx',
    body: 'Hello, world!'
}, {
    "Content-Type": 'application/xml',
    "Content-Disposition": 'attachment; filename=/test/file-xml.xxx',
    body: '<hello>world!</hello>'
}, {
    "Content-Type": 'application/json',
    "Content-Disposition": 'attachment; filename=/test/file-json.xxx',
    body: JSON.stringify({ hello: 'world!' })
}, {
    "Content-Type": 'application/octet-stream',
    "Content-Disposition": 'attachment; filename=/test/file-bin.xxx',
    body: String.fromCharCode(1, 0, 2, 4)
}, {
    "Content-Type": 'application/octet-stream',
    "Content-Disposition": 'attachment; filename=/test/chimay-blue.png',
    body: fs.readFileSync('/home/fgeorges/projects/ml/mlproj/mlproj-core/test/projects/simple-chimay/src/rsrc/images/chimay-blue.png').toString('xxx')
}]});

console.log(result.body);
console.log(fs.readFileSync('/home/fgeorges/projects/ml/mlproj/mlproj-core/test/projects/simple-chimay/src/rsrc/images/chimay-blue.png').toString('xxx'));

post('http://ml911:8000/v1/documents', result);
//post('https://requestb.in/1l9ktxh1', result);
