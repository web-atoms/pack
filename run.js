var Packer = require("./dist/FilePacker").default;

exports.default = function (cb, p) {
    try {
    var dir = p.dir;
    var file = p.file;
    var pkg = JSON.parse(p.config);
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