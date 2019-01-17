"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const FileApi_1 = require("./FileApi");
const FilePacker_1 = require("./FilePacker");
class Packer {
    run(args) {
        return __awaiter(this, void 0, void 0, function* () {
            const root = args[2];
            if (root) {
                process.chdir(root);
            }
            // const files = await FileApi.instance.readDir(
            //     ".",
            //     (f) =>
            //         /^src/i.test(f.path) &&
            //         !/^node\_modules/.test(f.path) && (f.isDirectory || /\.(js|html|xaml)$/.test(f.name)), true);
            // for (const iterator of files) {
            //     console.log(iterator.path);
            // }
            this.package = JSON.parse(yield FileApi_1.default.readString("package.json"));
            const config = this.config = JSON.parse(yield FileApi_1.default.readString("waconfig.json"));
            this.package.pack = config.pack || [];
            const packFiles = this.package.pack;
            if (!packFiles) {
                return;
            }
            const tasks = packFiles.map((file) => __awaiter(this, void 0, void 0, function* () {
                const packer = new FilePacker_1.default(file, this.package);
                yield packer.pack();
            }));
            yield Promise.all(tasks);
        });
    }
}
exports.default = Packer;
//# sourceMappingURL=Packer.js.map