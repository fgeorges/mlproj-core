module.exports = () => {
    return {
        mlproj: {
            format   : '0.1',
            "import" : 'base.json',
            connect  : {
                host: 'ml911',
                user: 'admin',
                password: 'admin'
            },
            commands : {
                ":do" : {
                    implem: (apis, environ, ctxt) => {
                        let resp;

                        resp = apis.get({
                            port: 8002,
                            path: '/manage/v2/databases'
                        });
                        console.log(':do - apis.get / port - %s', resp.status);
                        if ( resp.status !== 200 ) console.log(resp);

                        resp = apis.get({
                            api:  'manage',
                            path: '/databases'
                        });
                        console.log(':do - apis.get / api - %s', resp.status);
                        if ( resp.status !== 200 ) console.log(resp);

                        resp = apis.manage().get({
                            path: '/databases'
                        });
                        console.log(':do - apis.manage.get - %s', resp.status);
                        if ( resp.status !== 200 ) console.log(resp);

                        resp = apis.manage().databases();
                        console.log(':do - apis.manage.databases');
                        console.log(resp);

                        resp = apis.put({
                            port: 8002,
                            path: '/manage/v2/servers/simple-chimay/properties?group-id=Default',
                            body: { "modules-database": 0 }
                        });
                        console.log(':do - apis.put / port - %s', resp.status);
                        if ( resp.status !== 204 ) console.log(resp);

                        resp = apis.put({
                            api:  'manage',
                            path: '/servers/simple-chimay/properties?group-id=Default',
                            body: { "modules-database": 'simple-chimay-modules' }
                        });
                        console.log(':do - apis.put / api - %s', resp.status);
                        if ( resp.status !== 204 ) console.log(resp);

                        resp = apis.manage().put({
                            path: '/servers/simple-chimay/properties?group-id=Default',
                            body: { "modules-database": 0 }
                        });
                        console.log(':do - apis.manage.put - %s', resp.status);
                        if ( resp.status !== 204 ) console.log(resp);

                        resp = apis.manage().server('simple-chimay', 'Default').put({
                            path: '/properties',
                            body: { "modules-database": 'simple-chimay-modules' }
                        });
                        console.log(':do - apis.manage.server.put - %s', resp.status);
                        if ( resp.status !== 204 ) console.log(resp);

                        apis.manage().server('simple-chimay', 'Default').properties({
                            "modules-database": 'simple-chimay-modules'
                        });
                        console.log(':do - apis.manage.server.set properties');

                        resp = apis.manage().server('simple-chimay').properties();
                        console.log(':do - apis.manage.server.get properties');
                        console.log(resp);

                        let srv = apis.manage().server('simple-chimay');
                        srv.properties({ "modules-database": 0 });
                        resp = srv.properties();
                        console.log(resp);

                        //apis.manage().post('/...', { ... })
                        //apis.manage().db('content').properties()
                        //apis.manage().db('content').attach({ ... })
                    }
                },
                ":make" : (apis) => {
                }
            }
        }
    };
};
