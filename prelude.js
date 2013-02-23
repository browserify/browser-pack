
// modules are defined as an array
// [ module function, map of requireuires ]
//
// map of requireuires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the requireuire for previous bundles

(function(parent_req, modules, cache, entry) {
    function require(name){
        if(!cache[name]) {
            if(!modules[name]) {
                // if we cannot find the item within our internal map revert to parent
                if (parent_req) return parent_req(name);
                throw new Error('Cannot find module \'' + name + '\'');
            }
            var m = cache[name] = {exports:{}};
            modules[name][0](function(x){
                var id = modules[name][1][x];
                return require(id ? id : x);
            },m,m.exports);
        }
        return cache[name].exports
    }
    for(var i=0;i<entry.length;i++) require(entry[i]);
    return require;
})
