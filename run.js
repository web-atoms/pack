var Packer = require("./dist/FilePacker").default;

exports.default = function (cb, p) {
    try {
    var dir = p[0];
    var file = p[1];
    var pkg = p[2];
    var packer = new Packer(dir, file, pkg);
    packer.pack()
        .then(function() {
            cb(null, "done");
        })
        .catch(function(e) {
            cb(e.stack ? e.stack : e);
        });
    } catch (e1) {
        cb(e1.stack ? e1.stack : e1);
    }
}