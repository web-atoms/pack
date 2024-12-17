import { appendFile, readFile, writeFile } from "fs/promises";
import PackedFile from "./PackedFile";
import { spawnPromise } from "./spawnPromise";
import path = require("path");
import { existsSync, unlinkSync } from "fs";

export default class PackedLessFile extends PackedFile {

    constructor(p: string) {
        super(p);
        if (existsSync(p)) {
            unlinkSync(p);
        }
        if (existsSync(p + ".css.map")) {
            unlinkSync(p + ".css.map");
        }
    }

    append(src: string): Promise<void> {

        // make relative
        src = path.relative(this.dir, src).replaceAll("\\", "/");

        return appendFile(this.path, `@import (less) "${src}.css";\n`);
    }

    async postSave() {
        // convert less to css here

        const lessCPath = path.resolve("node_modules/less/bin/lessc");

        const dir = path.resolve(this.dir).replaceAll("\\", "/") + "/";

        const mapFileName = this.path + ".css.map";

        await spawnPromise( process.execPath , [
            lessCPath,
            "--source-map=" + mapFileName,
            this.path.replaceAll("\\", "/"),
            this.path.replaceAll("\\", "/") + ".css"
        ])

        // fix path...
        const map = JSON.parse(await readFile(mapFileName, "utf8"));

        map.sources = map.sources.map((x: string) => path.isAbsolute(x)
            ? path.relative(dir, x).replaceAll("\\", "/")
            : x);
        await writeFile(mapFileName, JSON.stringify(map));
    }

}