var Packer = require("./dist/FilePacker").default;

exports.default = function (cb, p) {
    var dir = p[0];
    var file = p[1];
    var pkg = JSON.parse(p[2]);
    var packer = new Packer(dir, file, pkg);
    packer.pack()
        .then(function() {
            cb(null);
        })
        .catch(function(e) {
            cb(e);
        });
}