var JSONStream = require('JSONStream');
var duplexer = require('duplexer');
var through = require('through');
var uglify = require('uglify-js');

var fs = require('fs');
var path = require('path');

var combineSourceMap = require('combine-source-map');

var prelude = (function () {
    var src = fs.readFileSync(path.join(__dirname, 'prelude.js'), 'utf8');
    return uglify(src) + '(typeof require!=="undefined"&&require,{';
})();

function newlinesIn(src) {
  if (!src) return 0;
  var newlines = src.match(/\n/g);

  return newlines ? newlines.length : 0;
}

module.exports = function (opts) {
    if (!opts) opts = {};
    var parser = opts.raw ? through() : JSONStream.parse([ true ]);
    var output = through(write, end);
    parser.pipe(output);
    
    var first = true;
    var entries = [];
    var order = []; 
    
    var lineno = 1 + newlinesIn(prelude);
    var sourcemap;

    return duplexer(parser, output);
    
    function write (row) {
        if (first) this.queue(prelude);
        
        if (row.sourceFile) { 
            sourcemap = sourcemap || combineSourceMap.create();
            sourcemap.addFile({ sourceFile: row.sourceFile, source: row.source }, { line: lineno });
        }

        var wrappedSource = [
            (first ? '' : ','),
            JSON.stringify(row.id),
            ':[',
            'function(require,module,exports){\n' + combineSourceMap.removeComments(row.source) + '\n}',
            ',',
            JSON.stringify(row.deps || {}),
            ']'
        ].join('');

        this.queue(wrappedSource);
        lineno += newlinesIn(wrappedSource);
        
        first = false;
        if (row.entry && row.order !== undefined) {
            entries.splice(row.order, 0, row.id);
        }
        else if (row.entry) entries.push(row.id);
    }
    
    function end () {
        if (first) this.queue(prelude);
        
        this.queue('},{},' + JSON.stringify(entries) + ')');
        if (sourcemap) this.queue('\n' + sourcemap.comment());

        this.queue(null);
    }
};
