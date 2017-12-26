var acorn = require('acorn');
var assignParent = require('estree-assign-parent');
var scan = require('scope-analyzer');
var through = require('through2');

module.exports = function esm () {
  return through.obj(function (row, enc, cb) {
    if (!row.esm) {
      cb(null, row);
      return;
    }

    var ast = acorn.parse(row.source, { sourceType: 'module' });
    assignParent(ast);
    scan.analyze(ast);

    var scope = scan.scope(ast);

    var esmDefaultName = '_esmDefault'
    var patches = [];
    ast.body.forEach(function (node) {
      if (node.type === 'ExportDefaultDeclaration') {
        if (node.declaration.id) {
          esmDefaultName = node.declaration.id.name
        }
        patches.push({
          start: node.start,
          end: node.declaration.start,
          string: node.declaration.id ? '' : 'var _esmDefault = '
        });
      }
      if (node.type === 'ExportNamedDeclaration') {
        if (node.declaration) {
          // Only erase the `export` bit before `export var`
          patches.push({ start: node.start, end: node.declaration.start, string: '' })
        } else {
          // Erase the entire declaration
          patches.push({ start: node.start, end: node.end, string: '' })
        }
      }
      if (node.type === 'ImportDeclaration') {
        patches.push({ start: node.start, end: node.end, string: '' });
      }
    });


    var setup = ''
    if (row.esm) {
      if (row.esm.exports.length > 0) {
        // Define getters for exports to support live bindings, and to prevent writes to them from outside this module
        setup += '_esmExport({'
        row.esm.exports.forEach(function (record, i) {
          if (i > 0) setup += ','
          if (record.name === 'default' && !record.as && !record.export) {
            setup += 'default:function(){return ' + esmDefaultName + '}'
          } else {
            setup += JSON.stringify(record.as) + ':function(){return ' + record.export + '}'
          }
        });
        setup += '});'
      }

      var needInterop = false;
      var baseImports = {};
      row.esm.imports.forEach(function (record, i) {
        var binding = scope.getBinding(record.as);
        if (!record.esm) {
          if (record.import !== 'default') {
            throw new Error('The requested module does not provide an export named \'' + record.import + '\'')
          }
          setup += 'var ' + record.as + ' = ' + '_esmRequire(' + JSON.stringify(record.from) + ');';
          return;
        }

        var base = baseImports[record.from];
        if (!base) {
          base = baseImports[record.from] = '_esmImport' + i;
          setup += 'var ' + base + ' = _esmRequire(' + JSON.stringify(record.from) + ');';
        }
        binding.references.forEach(function (ref, i) {
          if (ref === binding.definition) return
          patches.push({
            start: ref.start,
            end: ref.end,
            string: base + '.' + record.import
          });
        });
      });
    }

    row.source = patch(row.source, patches)
    row.source = setup + '\n' + row.source
    cb(null, row);
  });
};

function patch (str, patches) {
  patches = patches.slice().sort(function (a, b) { return a.start - b.start })

  var offset = 0
  patches.forEach(function (r) {
    var start = r.start + offset
    var end = r.end + offset
    str = str.slice(0, start) + r.string + str.slice(end)

    offset += r.start - r.end + r.string.length
  })

  return str
}
