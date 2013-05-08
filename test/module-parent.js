var test = require('tape');
var pack = require('../');

test('raw', function (t) {
    t.plan(3);
    
    var p = pack({ raw: true });
    var src = '';
    p.on('data', function (buf) { src += buf });
    p.on('end', function () {
        var r = Function(['T'], 'return ' + src)(t);

        t.equal(r('abc').parent, null);
        t.equal(r('xyz').parent.sourceName, "abc");
    });
    
    p.write({
        id: 'abc',
        source: 'module.sourceName = "abc"; require("./xyz"); module.exports = module;',
        deps: { './xyz': 'xyz' }
    });
    
    p.write({
        id: 'xyz',
        source: 'T.equal(module.parent.sourceName, "abc"); module.exports = module;'
    });
    
    p.end();
});
