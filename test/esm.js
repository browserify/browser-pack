var test = require('tap').test;
var dedent = require('dedent');
var pack = require('../');
var vm = require('vm');

test('esm', function (t) {
    t.plan(6);

    var p = pack({ raw: true });
    var src = '';
    p.on('data', function (buf) { src += buf; });
    p.on('end', function () {
        var expected = [
            ['type', 'function'],
            ['value', 0],
            ['value', 5]
        ]
        vm.runInNewContext(src, {
            T: t,
            console: { log: log }
        });
        function log (a, b) {
            var cur = expected.shift()
            t.ok(a === cur[0] && b === cur[1])
        }
    });

    p.write({
        id: 'test',
        entry: true,
        esm: { imports: [], exports: [] },
        source: dedent`
            T.equal(typeof require, 'undefined')
            T.equal(typeof module, 'undefined')
            T.equal(typeof exports, 'undefined')
        `
    });

    p.write({
        id: 'abc',
        entry: true,
        esm: {
            imports: [
                { from: 'x', import: 'default', as: 'x', esm: true },
                { from: 'y', import: 'default', as: 'y' },
                { from: 'z', import: 'c', as: 'renamed', esm: true },
                { from: 'z', import: 'x', as: 'i', esm: true }
            ],
            exports: []
        },
        source: dedent`
            import x from "x";
            import y from "y";
            import { c as renamed, x as i } from "z";
            y.b(x);
            x(renamed);
            i()
            x(renamed);
        `
    })
    // Test importing a CommonJS module
    p.write({
        id: 'y',
        source: 'exports.a = "a"; exports.b = function b () {console.log("type",typeof arguments[0])}'
    })
    // Test live bindings
    p.write({
        id: 'z',
        esm: {
            imports: [],
            exports: [
                { export: 'c', as: 'c' },
                { export: 'x', as: 'x' }
            ]
        },
        source: 'export var c = 0; export var x = function(){ c += 5 }'
    })
    p.end({
        id: 'x',
        esm: {
            imports: [],
            exports: [
                { export: 'c', as: 'default' }
            ]
        },
        source: 'export default c; function c(arg){ console.log("value", arg) }'
    });

});
