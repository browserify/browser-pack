var vm = require('vm');
var test = require('tap').test;
var pack = require('../');

test('external modules', function (t) {
    t.plan(1);

    var p1 = pack({ raw: true, hasExports: true });
    var p2 = pack({ raw: true, hasExports: true });

    var s1 = '';
    var s2 = '';
    p1.on('data', function (buf) { s1 += buf });
    p2.on('data', function (buf) { s2 += buf });
    p2.on('end', function () {
        var context = vm.createContext({ });
        vm.runInContext('require=' + s1, context);
        vm.runInContext('require=' + s2, context);
        t.equal(context.require('foo'), 'hello');
        t.end();
    });

    p2.write({
        id: 'foo',
        source: 'module.exports = require("./bar")',
        deps: { './bar': 'bar' },
        entry: true
    });

    p1.write({
        id: 'bar',
        source: 'module.exports = require("./baz")',
        deps: { './baz': 'baz' }
    });

    p2.write({
        id: 'baz',
        source: 'module.exports = "hello"'
    });

    p1.end();
    p2.end();
});
