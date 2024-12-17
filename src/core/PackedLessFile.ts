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

        return appendFile(this.path, `@import (less) "${src}";\n`);
    }

    async postSave() {
        // convert less to css here

        const lessCPath = path.resolve("node_modules/less/bin/lessc");

        const dir = path.resolve(this.dir).replaceAll("\\", "/") + "/";

        const mapFileName = this.name + ".css.map";

        const mapFile = path.join(this.dir, mapFileName);

        await spawnPromise( process.execPath , [
            lessCPath,
            "--source-map=" + mapFileName,
            "--source-map-basepath=" + dir + "/",
            this.name,
            this.name + ".css"
        ], {
            cwd: dir
        })

        // fix path...
        const map = JSON.parse(await readFile(mapFile, "utf8"));

        map.sources = map.sources.map((x) => path.relative(dir, x).replaceAll("\\", "/"));
        await writeFile(mapFile, JSON.stringify(map));
    }

}