var JSONStream = require('JSONStream');
var through = require('through');
var umd = require('umd');

var fs = require('fs');
var path = require('path');

var combineSourceMap = require('combine-source-map');

var defaultPrelude = fs.readFileSync(
      path.join(__dirname, '_prelude.js'), 'utf8');

function newlinesIn(src) {
  if (!src) return 0;
  var newlines = src.match(/\n/g);

  return newlines ? newlines.length : 0;
}

module.exports = function (opts) {
    if (!opts) opts = {};
    var parser = opts.raw ? through() : JSONStream.parse([ true ]);
    var standalone = opts.standalone || false;
    var stream = through(
        function (buf) { parser.write(buf) },
        function () { parser.end() }
    );
    parser.pipe(through(write, end));
    
    var first = true;
    var entries = [];
    var prelude = opts.prelude || defaultPrelude;
    
    if (standalone) {
        prelude = umd.prelude(standalone) + 'return ' + prelude;
    }

    var lineno = 1 + newlinesIn(prelude);
    var sourcemap;
    var seenSourceFiles = {};
    var mainModule = null;

    return stream;
    
    function write (row) {
        if (first) stream.queue(prelude + '({');
        
        if (row.sourceFile && !seenSourceFiles[row.sourceFile]) { 
	    seenSourceFiles[row.sourceFile] = true;
            sourcemap = sourcemap || combineSourceMap.create();
            sourcemap.addFile(
                { sourceFile: row.sourceFile, source: row.source },
                { line: lineno }
            );
        }
        
        var wrappedSource = [
            (first ? '' : ','),
            JSON.stringify(row.id),
            ':[',
            'function(require,module,exports){\n',
            combineSourceMap.removeComments(row.source),
            '\n},',
            '{' + Object.keys(row.deps || {}).sort().map(function (key) {
                return JSON.stringify(key) + ':'
                    + JSON.stringify(row.deps[key])
                ;
            }).join(',') + '}',
            ']'
        ].join('');

        stream.queue(wrappedSource);
        lineno += newlinesIn(wrappedSource);
        
        first = false;
        if (row.entry) {
            mainModule = mainModule || row.id;
            if (row.order !== undefined) {
                entries[row.order] = row.id;
            } else {
                entries.push(row.id);
            }
        }
    }
    
    function end () {
        if (first) stream.queue(prelude + '({');
        entries = entries.filter(function (x) { return x !== undefined });
        
        stream.queue('},{},' + JSON.stringify(entries) + ')');
        if (standalone) {
            stream.queue('\n(' + mainModule + ')');
            stream.queue(umd.postlude(standalone));
        }
        if (sourcemap) stream.queue('\n' + sourcemap.comment());

        stream.queue(null);
    }
};
