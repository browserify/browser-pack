var test = require('tape');
var pack = require('../');

test('raw', function (t) {
    t.plan(2);
    
    var p = pack({ raw: true });
    var src = '';
    p.on('data', function (buf) { src += buf });
    p.on('end', function () {
        var r = Function(['T'], 'return ' + src)(t);
    });
    
    p.write({
        id: 'abc',
        source: 'module.exports = module; require("./xyz"); T.equal(module.children[0].sourceName, "xyz");',
        entry: true,
        deps: { './xyz': 'xyz' }
    });
    
    p.write({
        id: 'xyz',
        source: 'module.sourceName = "xyz"; require("abc"); T.equal(module.children.length, 0); module.exports = module;',
        deps: { './abc': 'abc' }
    });
    
    p.end();
});
