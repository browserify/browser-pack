var JSONStream = require('JSONStream');
var duplexer = require('duplexer');
var through = require('through');
var uglify = require('uglify-js');

var fs = require('fs');
var path = require('path');

var prelude = (function () {
    var src = fs.readFileSync(path.join(__dirname, 'prelude.js'), 'utf8');
    return uglify(src) + '(typeof require!=="undefined"&&require,{'
})();

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
