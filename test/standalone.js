var test = require('tape');
var pack = require('../');

function decode(base64) {
    return new Buffer(base64, 'base64').toString();
}

function grabSourceMap(lastLine) {
    var base64 = lastLine.split(',').pop();
    return JSON.parse(decode(base64));
}

function grabLastLine(src) {
    return src.split('\n').pop();
}

test('pack a bundle with a umd wrapper', function (t) {
    t.plan(3);

    var p = pack({standalone: 'abc'});
    var src = '';
    p.on('data', function (buf) { src += buf });
    p.on('end', function () {
        var r = Function(['T'], src + '\nreturn abc;')();
        t.equal(r, "bar", "global is properly exported");

        var lastLine = grabLastLine(src);
        var sm = grabSourceMap(lastLine);

        t.ok(/^\/\/@ sourceMappingURL/.test(lastLine), 'contains source mapping url as last line');
        t.equal(sm.mappings, ';;AAAA', 'adds offset mapping for each line' );
    });

    p.end(JSON.stringify([
        {
            id: 1,
            source: 'module.exports = "bar";',
            sourceFile: 'foo.js',
            entry: true
        }
    ]));
});
