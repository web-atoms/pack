import { appendFile, readFile, writeFile } from "fs/promises";
import PackedFile from "./PackedFile";
import { spawnPromise } from "./spawnPromise";
import path = require("path");
import { exists, existsSync, statSync, unlink, unlinkSync } from "fs";

export default class PackedCssFile extends PackedFile {

    public readonly src: string;

    constructor(p: string) {
        super(p);
        this.src = p + ".css";
        if (existsSync(p)) {
            unlinkSync(p);
        }
        if (existsSync(p + ".map")) {
            unlinkSync(p + ".map");
        }
        if (existsSync(this.src)) {
            unlinkSync(this.src);
        }
        if (existsSync(this.src + ".map")) {
            unlinkSync(this.src + ".map");
        }
    }

    get isEmpty() {
        if (!existsSync(this.src)) {
            return true;
        }
        const s = statSync(this.src);
        return s.size === 0;
    }

    async append(src: string) {

        // make relative
        src = path.relative(this.dir, src).replaceAll("\\", "/");

        await appendFile(this.src, `@import "${src}";\n`);
    }

    async postSave() {
        // convert less to css here

        if (this.isEmpty) {
            return;
        }

        if (!existsSync(this.src)) {
            return;
        }

        const postCssPath = path.resolve("node_modules/postcss-cli/index.js");

        const dir = path.resolve(this.dir).replaceAll("\\", "/") + "/";

        const mapFileName = this.name + ".map";

        console.log(this.dir);

        await spawnPromise( process.execPath , [
            postCssPath,
            this.name + ".css",
            "-o", this.name,
            "--map"
        ], {
            cwd: this.dir
        })

        // fix path...
        await unlinkSync(this.src);

        const mapFilePath = path.join(this.dir, mapFileName);

        const map = JSON.parse(await readFile(  mapFilePath, "utf8"));

        map.sources = map.sources.map((x: string) => path.isAbsolute(x)
            ? path.relative(dir, x).replaceAll("\\", "/")
            : x);
        await writeFile(mapFilePath, JSON.stringify(map));
    }

}