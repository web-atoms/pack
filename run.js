var Packer = require("./dist/Packer").default;

var packer = new Packer();
exports.default = function (cb, p) {
    packer.run(p || [])
        .then(function(r) {
            cb(null, r);
        })
        .catch(function(e) {
            cb(e);
        });
}