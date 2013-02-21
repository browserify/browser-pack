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
    var order = []; 
    
    return duplexer(parser, output);
    
    function write (row) {
        if (first) this.queue(prelude);
        
        this.queue([
            (first ? '' : ','),
            JSON.stringify(row.id),
            ':[',
            'function(require,module,exports){' + row.source + '\n}',
            ',',
            JSON.stringify(row.deps || {}),
            ']'
        ].join(''));
        
        first = false;
        if (row.entry && row.order !== undefined) {
            entries.splice(row.order, 0, row.id);
        }
        else if (row.entry) entries.push(row.id);
    }
    
    function end () {
        if (first) this.queue(prelude);
        
        this.queue('},{},' + JSON.stringify(entries) + ')');
        this.queue(null);
    }
};
