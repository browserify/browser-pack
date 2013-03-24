
// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles

(function(parent_req, modules, cache, entry) {
    function inner_req(name, jumped){
        if(!cache[name]) {
            if(!modules[name]) {
                // if we cannot find the item within our internal map jump to
                // current root require go all requires down from there
                var rootRequire = typeof require == "function" && require;
                if (!jumped && rootRequire) return rootRequire(name, true);
                if (parent_req) return parent_req(name);
                throw new Error('Cannot find module \'' + name + '\'');
            }
            var m = cache[name] = {exports:{}};
            modules[name][0](function(x){
                var id = modules[name][1][x];
                return inner_req(id ? id : x);
            },m,m.exports);
        }
        return cache[name].exports
    }
    for(var i=0;i<entry.length;i++) inner_req(entry[i]);
    return inner_req;
})
