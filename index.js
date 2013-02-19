var JSONStream = require('JSONStream');
var duplexer = require('duplexer');
var through = require('through');

var prelude = [
    '(function(p,c,e){',
        'function r(n){',
            'if(!c[n]){',
                'if(!p[n])return;',
                'c[n]={exports:{}};',
                'p[n][0](function(x){',
                    'return r(p[n][1][x])',
                '},c[n],c[n].exports);',
            '}',
            'return c[n].exports',
        '}',
        'for(var i=0;i<e.length;i++)r(e[i]);',
        'return r',
    '})({'
].join('');

module.exports = function (opts) {
    if (!opts) opts = {};
    var parser = opts.raw ? through() : JSONStream.parse([ true ]);
    var output = through(write, end);
    parser.pipe(output);
    
    var first = true;
    var entries = [];
    
    return duplexer(parser, output);
    
    function write (row) {
        if (first) output.emit('data', prelude);
        
        this.emit('data', [
            (first ? '' : ','),
            JSON.stringify(row.id),
            ':[',
            'function(require,module,exports){' + row.source + '\n}',
            ',',
            JSON.stringify(row.deps || {}),
            ']'
        ].join(''));
        
        first = false;
        entries.push(row.id);
    }
    
    function end () {
        if (first) output.emit('data', prelude);
        
        this.emit('data', '},{},' + JSON.stringify(entries) + ')');
        this.emit('end');
    }
};
