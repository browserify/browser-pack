/**
 * In node.js `this` on the module root is the same as `exports`. Browser-pack
 * should act like it too.
 **/
var test = require('tape');
var pack = require('../');

test('this', function (t) {
    t.plan(3);

    var p = pack();
    var src = '';
    p.on('data', function (buf) { src += buf; });
    p.on('end', function () {
        var r = Function(['T'], 'return ' + src)(t);
        t.deepEqual(r("abc"), { foo: "bar" });
    });

    p.end(JSON.stringify([{
        id: 'abc',
        source: 'this.foo = "bar"; T.equal(require, module.require); T.equal(module.require.call(null, module.id), module.exports);'
    }]));

});
