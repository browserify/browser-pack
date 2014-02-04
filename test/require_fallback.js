/**
 * We should be able to change the require fallback instead of just using the global one
 * This relates to non-browser environments like node-webkit
 **/
var test = require('tape');
var pack = require('../');

test('require_fallback', function (t) {
    t.plan(1);

    var p = pack({requireFallback: 'taco'});
    var tacos = 0;
    function taco() {
      return tacos++;
    }
    var src = '';
    p.on('data', function (buf) { src += buf; });
    p.on('end', function () {
      var r = Function(['taco'], 'return ' + src)(taco);
      r('require_fallback');
      t.equal(tacos, 2);
    });

    p.end(JSON.stringify([{
      id: 'require_fallback',
      source: 'require("not-there"); require("require_fallback"); require("not-there")'
    }]));

});
