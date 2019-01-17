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
class FilePacker {
    constructor(file, packageConfig) {
        this.file = file;
        this.packageConfig = packageConfig;
        this.content = [];
        this.dependencies = [];
    }
    pack() {
        return __awaiter(this, void 0, void 0, function* () {
            const input = (yield FileApi_1.default.readString(this.file + ".d.ts"))
                .split("\n")
                .map((s) => s.trim());
            // pack modules...
        });
    }
}
exports.default = FilePacker;
//# sourceMappingURL=FilePacker.js.map