var Packer = require("./dist/Packer").default;

var packer = new Packer();
exports.default = function (cb, p) {
    packer.run(p || [])
        .then(function() {
            cb(null,"done");
        })
        .catch(function(e) {
            cb(e);
        });
}