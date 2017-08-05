module namespace fooz = "http://mlproj.org/example/simple-chimay/lib/fooz";

declare function fooz:hello($who)
{
   'Hello, ' || $who || '!'
};
