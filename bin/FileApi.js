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
const fs_1 = require("fs");
const path_1 = require("path");
class FileApi {
    readString(path) {
        return new Promise((resolve, reject) => {
            fs_1.readFile(path, "utf8", (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            });
        });
    }
    writeString(path, data) {
        return new Promise((resolve, reject) => {
            fs_1.writeFile(path, data, "utf8", (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
    }
    exists(path) {
        return new Promise((resolve, reject) => {
            fs_1.access(path, fs_1.constants.F_OK, (error) => {
                resolve(!error);
            });
        });
    }
    writeOnlyIfChanged(path, content) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.exists(path)) {
                const existing = yield this.readString(path);
                if (existing === content) {
                    return;
                }
                if (this.flat(existing) === this.flat(content)) {
                    return;
                }
            }
            yield this.writeString(path, content);
        });
    }
    stat(file) {
        const filePath = typeof file === "string" ? file : file.path;
        return new Promise((resolve, reject) => {
            fs_1.stat(filePath, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }
    readDir(folder, filter = (file) => true, nest = false) {
        return __awaiter(this, void 0, void 0, function* () {
            const filePath = typeof folder === "string" ? folder : folder.path;
            // read file names
            const result = yield new Promise((resolve, reject) => {
                fs_1.readdir(filePath, (error, files) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(files.map((s) => ({
                        name: s,
                        path: path_1.join(filePath, s)
                    })));
                });
            });
            let all = [...result.filter(filter)];
            yield Promise.all(result.map((iterator) => __awaiter(this, void 0, void 0, function* () {
                const fstat1 = yield this.stat(iterator);
                const path = path_1.parse(iterator.path);
                iterator.length = fstat1.size;
                iterator.isDirectory = fstat1.isDirectory();
                iterator.ext = path.ext;
                iterator.dir = path.dir;
                iterator.nameWithoutExtension = path.name;
                if (iterator.isDirectory && nest) {
                    const children = yield this.readDir(iterator, filter, true);
                    all = all.concat(children);
                }
            })));
            return all;
        });
    }
    flat(content) {
        return content
            .split("\n")
            .map((s) => s.trimRight())
            .join("\n");
    }
}
FileApi.instance = new FileApi();
exports.FileApi = FileApi;
const fileApi = FileApi.instance;
exports.default = fileApi;
//# sourceMappingURL=FileApi.js.map