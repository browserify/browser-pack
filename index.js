var JSONStream = require('JSONStream');
var duplexer = require('duplexer');
var through = require('through');
var uglify = require('uglify-js');

var fs = require('fs');
var path = require('path');

var prelude = (function () {
    var src = fs.readFileSync(path.join(__dirname, 'prelude.js'), 'utf8');
    return uglify(src) + '(typeof require!=="undefined"&&require,{';
})();

function linesIn(src) {
  if (!src) return 0;
  var newLines = src.match(/\n/g);

  return newLines ? newLines.length + 1 : 1;
}

module.exports = function (opts) {
    if (!opts) opts = {};
    var parser = opts.raw ? through() : JSONStream.parse([ true ]);
    var output = through(write, end);
    parser.pipe(output);
    
    var first = true;
    var entries = [];
    var order = []; 
    
    var lineno = 1;
    var linesInHeader = 1;
    var linesInFooter = 1;

    var duplexed = duplexer(parser, output);
    return duplexed;
    
    function updateLinenoAndEmitRange(sourceFile, src) {
      if (first) lineno += linesIn(prelude);

      lineno += linesInHeader;
      var linesInSource = linesIn(src);

      var range = JSON.stringify({ 
          sourceFile :  sourceFile,
          start      :  lineno,
          end        :  lineno + linesInSource - 1
      });
      duplexed.emit('range', range);

      lineno += (linesInSource + linesInFooter);
    }

    function write (row) {
        if (first) this.queue(prelude);
        
        this.queue([
            (first ? '' : ','),
            JSON.stringify(row.id),
            ':[',
            'function(require,module,exports){\n' + row.source + '\n}',
            ',',
            JSON.stringify(row.deps || {}),
            ']'
        ].join(''));
        
        first = false;
        if (row.entry && row.order !== undefined) {
            entries.splice(row.order, 0, row.id);
        }
        else if (row.entry) entries.push(row.id);

        // presence of source file indicates that we want source ranges to be emitted
        if (row.sourceFile) updateLinenoAndEmitRange(row.sourceFile, row.source);
    }
    
    function end () {
        if (first) this.queue(prelude);
        
        this.queue('},{},' + JSON.stringify(entries) + ')');
        this.queue(null);
    }
};
