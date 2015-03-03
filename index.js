var JSONStream = require('JSONStream');
var defined = require('defined');
var through = require('through2');
var umd = require('umd');

var fs = require('fs');
var path = require('path');

var combineSourceMap = require('combine-source-map');

var defaultPreludePath = path.join(__dirname, '_prelude.js');
var defaultPrelude = fs.readFileSync(defaultPreludePath, 'utf8');

function newlinesIn(src) {
  if (!src) return 0;
  var newlines = src.match(/\n/g);

  return newlines ? newlines.length : 0;
}

module.exports = function (opts) {
    if (!opts) opts = {};
    var parser = opts.raw ? through.obj() : JSONStream.parse([ true ]);
    var stream = through.obj(
        function (buf, enc, next) { parser.write(buf); next() },
        function () { parser.end() }
    );
    parser.pipe(through.obj(write, end));
    stream.standaloneModule = opts.standaloneModule;
    stream.hasExports = opts.hasExports;
    
    var first = true;
    var entries = [];
    var basedir = defined(opts.basedir, process.cwd());
    var prelude = opts.prelude || defaultPrelude;
    var preludePath = opts.preludePath ||
        path.relative(basedir, defaultPreludePath).replace(/\\/g, '/');
    
    var lineno = 1 + newlinesIn(prelude);
    var sourcemap;

    var externalRequireName = opts.externalRequireName || 'require';

    if (opts.standalone) {
        var umdContent = {
            prelude: umd.prelude(opts.standalone).trim() + 'return (',
            postlude: ');' + umd.postlude(opts.standalone)
        };
    }

    return stream;
    
    function write (row, enc, next) {
        // If hasExports, output the bundle with an exposed require and no UMD
        // wrapper, regardless of opts.standalone. See end() for UMD
        // integration in this case.
        if (first && stream.hasExports) {
            stream.push(Buffer(externalRequireName + '='));
            if (opts.standalone && row.expose !== undefined) {
                stream.standaloneModule = row.expose;
            }
        }
        // If opts.standalone && !hasExports, wrap the bundle with UMD.
        else if (first && opts.standalone) {
            stream.push(Buffer(umdContent.prelude));
        }
        if (first) stream.push(Buffer(prelude + '({'));
        
        if (row.sourceFile && !row.nomap) {
            if (!sourcemap) {
                sourcemap = combineSourceMap.create();
                sourcemap.addFile(
                    { sourceFile: preludePath, source: prelude },
                    { line: 0 }
                );
            }
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

        stream.push(Buffer(wrappedSource));
        lineno += newlinesIn(wrappedSource);
        
        first = false;
        if (row.entry && row.order !== undefined) {
            entries[row.order] = row.id;
        }
        else if (row.entry) entries.push(row.id);
        next();
    }
    
    function end () {
        if (first) stream.push(Buffer(prelude + '({'));
        entries = entries.filter(function (x) { return x !== undefined });
        
        stream.push(Buffer('},{},' + JSON.stringify(entries) + ')'));
        
        if (opts.standalone) {
            umdContent.src = '';

            // Bundle was not wrapped with UMD because of hasExports. Now output
            // UMD prelude to wrap a require(standaloneModuleName) call.
            if (stream.hasExports) {
                umdContent.src +=
                    ';\n' +
                    umdContent.prelude +
                    externalRequireName
                ;
            }

            umdContent.src +=
                '(' + JSON.stringify(stream.standaloneModule) + ')' +
                umdContent.postlude
            ;

            stream.push(Buffer(umdContent.src));
        }
        
        if (sourcemap) {
            var comment = sourcemap.comment();
            if (opts.sourceMapPrefix) {
                comment = comment.replace(
                    /^\/\/#/, function () { return opts.sourceMapPrefix }
                )
            }
            stream.push(Buffer('\n' + comment + '\n'));
        }
        if (!sourcemap && !opts.standalone) stream.push(Buffer(';\n'));

        stream.push(null);
    }
};
