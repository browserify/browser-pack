var JSONStream = require('JSONStream');
var duplexer = require('duplexer');
var through = require('through');
var uglify = require('uglify-js');

var fs = require('fs');
var path = require('path');

var createGenerator = require('inline-source-map');

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
    var generator;

    return duplexer(parser, output);
    
    function addMappings(row) {
      generator = generator || createGenerator({ sourceRoot: row.sourceRoot });
      var offset = { line: lineno, column: 0 };

      if (row.mappings && row.mappings.length)
          generator.addMappings(row.sourceFile, row.mappings, offset);
      else 
          generator.addGeneratedMappings(row.sourceFile, row.source, offset);

      generator.addSourceContent(row.sourceFile, row.source);
    }

    function write (row) {
        if (first) this.queue(prelude);
        
        if (row.sourceFile) addMappings(row);

        wrappedSource = [
            (first ? '' : ','),
            JSON.stringify(row.id),
            ':[',
            'function(require,module,exports){\n' + row.source + '\n}',
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
        if (generator) this.queue('\n' + generator.inlineMappingUrl());

        this.queue(null);
    }
};
