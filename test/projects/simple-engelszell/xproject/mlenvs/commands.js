module.exports = () => ({
    mlproj: {
        format   : '0.1',
        "import" : 'base.json',
        commands : {
            evalTypes: (apis, env, ctxt) => {
                const parts = apis.eval({}, {
                    database: env.database('content').name,
                    xquery:   `
                        (: standard atomic types :)
                        (: https://www.w3.org/TR/xpath-functions-31/#constructor-functions-for-xsd-types :)
                        (: xs:dateTimeStamp is not supported :)

                        xs:string('hello'),
                        xs:boolean('true'),
                        xs:decimal('123'),
                        xs:float('123'),
                        xs:double('123'),
                        xs:duration('PT1S'),
                        xs:dateTime('1979-09-01T06:00:00'),
                        xs:time('06:00:00'),
                        xs:date('1979-09-01'),
                        xs:gYearMonth('1979-09'),
                        xs:gYear('1979'),
                        xs:gMonthDay('--09-01'),
                        xs:gDay('---01'),
                        xs:gMonth('--09'),
                        xs:hexBinary('BAAAAAAD'),
                        xs:base64Binary('1234567890abcdef'),
                        xs:anyURI('hello'),
                        xs:QName('hello'),
                        xs:normalizedString('hello'),
                        xs:token('hello'),
                        xs:language('hello'),
                        xs:NMTOKEN('hello'),
                        xs:Name('hello'),
                        xs:NCName('hello'),
                        xs:ID('hello'),
                        xs:IDREF('hello'),
                        xs:ENTITY('hello'),
                        xs:integer('123'),
                        xs:nonPositiveInteger('0'),
                        xs:negativeInteger('-123'),
                        xs:long('123'),
                        xs:int('123'),
                        xs:short('123'),
                        xs:byte('123'),
                        xs:nonNegativeInteger('0'),
                        xs:unsignedLong('123'),
                        xs:unsignedInt('123'),
                        xs:unsignedShort('123'),
                        xs:unsignedByte('123'),
                        xs:positiveInteger('123'),
                        xs:yearMonthDuration('P1Y'),
                        xs:dayTimeDuration('P1D'),
                        xs:untypedAtomic('hello'),

                        (: standard nodes :)
                        processing-instruction pi { 'content' },
                        document { () },
                        element elem { 'yup' },
                        attribute attr { 'yeah' },
                        comment { 'foo bar' },
                        text { 'Hello, world!' },

                        (: marklogic nodes :)
                        binary { xs:hexBinary('BAAAAAAD') },

                        (: json nodes :)
                        object-node { 'foo': 'bar'},
                        array-node { (1, 2, 3) },
                        number-node { 42 },
                        boolean-node { fn:true() },
                        null-node {}` });
                parts.forEach(p => p.kind !== 'binary' && p.parse());
                console.dir(parts);
            }
        }
    }
});
