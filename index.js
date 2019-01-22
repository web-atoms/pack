var Packer = require("./dist/Packer").default;

var packer = new Packer();
packer.run(process.argv)
    .then(function() {
        process.exit(0);
    })
    .catch(function(e) {
        console.error(e.stack ? e.stack : e);
        process.exit(1);
    });