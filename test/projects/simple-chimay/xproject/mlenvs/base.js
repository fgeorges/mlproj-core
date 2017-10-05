module.exports = function() {
    return {
        "mlproj": {
            "format": "0.1",
            "params": {
                "port": "6020"
            },
            "sources": [{
                "name":   "src",
                "dir":    "src",
                "filter": function(desc) {
                    if ( true ) {
                        console.log('[**] FILTER, desc:');
                        console.log(desc);
                    }
                    if ( desc.isIncluded && ! desc.isExcluded ) {
                        return desc;
                    }
                }
            }],
            "databases": [{
                "id": "content",
                "name": "@{code}-content"
            }],
            "servers": [{
                "id": "app",
                "name": "@{code}",
                "type": "http",
                "port": "${port}",
                "content": {
                    "idref": "content"
                }
            }]
        }
    };
};
