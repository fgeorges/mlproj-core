module namespace foo = "http://mlproj.org/example/simple-chimay/lib/foo";

declare function foo:hello($who)
{
   'Hello, ' || $who || '!'
};
