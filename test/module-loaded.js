var test = require('tape');
var pack = require('../');

test('raw', function (t) {
    t.plan(2);

    var p = pack({ raw: true });
    var src = '';
    p.on('data', function (buf) { src += buf });
    p.on('end', function () {
        var r = Function(['T'], 'return ' + src)(t);

        t.equal(r('abc').loaded, true);
    });

    p.write({
        id: 'abc',
        source: 'T.equal(module.loaded, false); module.exports = module;'
    });

    p.end();
});
