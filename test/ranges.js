/*jshint asi: true, evil: true*/
var test = require('tape');
var pack = require('../');

test('pack with sourceFile defined for foo and bar', function (t) {
    t.plan(5);
    
    var p = pack();
    var src = '';
    var ranges = [];
    p.on('data', function (buf) { src += buf });
    p.on('range', function (range) { ranges.push(JSON.parse(range)) });
    p.on('end', function () {
        var r = Function(['T'], 'return ' + src)(t);
        t.equal(r('xyz')(5), 555);
        t.equal(r('xyz')(5), 555);

        t.deepEqual(
            ranges, 
            [ { sourceFile: '/public/js/foo.js', start: 2, end: 2 },
              { sourceFile: '/public/js/bar.js', start: 5, end: 8 } ], 
            'emits correct ranges for foo and bar'
        )
    });
    
    p.end(JSON.stringify([
        {
            id: 'abc',
            source: 'T.equal(require("./xyz")(3), 333)',
            entry: true,
            deps: { './xyz': 'xyz' },
            sourceFile: '/public/js/foo.js'
        },
        {
            id: 'xyz',
            source: 'T.ok(true);\nmodule.exports=function(n){\n   return n*111\n}',
            sourceFile: '/public/js/bar.js'
        }
    ]));
});

test('pack with no sourceFile defined', function (t) {
    t.plan(5);
    
    var p = pack();
    var src = '';
    var ranges = [];
    p.on('data', function (buf) { src += buf });
    p.on('range', function (range) { ranges.push(JSON.parse(range)) });
    p.on('end', function () {
        var r = Function(['T'], 'return ' + src)(t);
        t.equal(r('xyz')(5), 555);
        t.equal(r('xyz')(5), 555);

        t.deepEqual(ranges, [], 'emits no ranges for either foo or bar')
    });
    
    p.end(JSON.stringify([
        {
            id: 'abc',
            source: 'T.equal(require("./xyz")(3), 333)',
            entry: true,
            deps: { './xyz': 'xyz' }
        },
        {
            id: 'xyz',
            source: 'T.ok(true);\nmodule.exports=function(n){\n   return n*111\n}'
        }
    ]));
});

test('pack with sourceFile defined for foo but not bar', function (t) {
    t.plan(5);
    
    var p = pack();
    var src = '';
    var ranges = [];
    p.on('data', function (buf) { src += buf });
    p.on('range', function (range) { ranges.push(JSON.parse(range)) });
    p.on('end', function () {
        var r = Function(['T'], 'return ' + src)(t);
        t.equal(r('xyz')(5), 555);
        t.equal(r('xyz')(5), 555);

        t.deepEqual(
            ranges, 
            [ { sourceFile: '/public/js/foo.js', start: 2, end: 2 } ],
            'emits correct range for foo, but none for bar'
        )
    });
    
    p.end(JSON.stringify([
        {
            id: 'abc',
            source: 'T.equal(require("./xyz")(3), 333)',
            entry: true,
            deps: { './xyz': 'xyz' },
            sourceFile: '/public/js/foo.js'
        },
        {
            id: 'xyz',
            source: 'T.ok(true);\nmodule.exports=function(n){\n   return n*111\n}'
        }
    ]));
});
