import { appendFile, readFile, writeFile } from "fs/promises";
import PackedFile from "./PackedFile";
import { spawnPromise } from "./spawnPromise";
import path = require("path");
import { exists, existsSync, unlinkSync } from "fs";

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

    async append(src: string) {


        // find last map...
        const sourceFile = await this.findSourceFile(src + ".css");
        if (sourceFile) {
            await appendFile(this.path, `@import (less) "${sourceFile}";\n`);
            return;
        }

        // make relative
        src = path.relative(this.dir, src).replaceAll("\\", "/");

        await appendFile(this.path, `@import (less) "${src}.css";\n`);
    }

    async findSourceFile(filePath: string) {
        try {

            const dir = path.dirname(filePath);

            const fileContent = await readFile(filePath, "utf-8");

            let lastLine = null;
            for(const m of fileContent.matchAll(/[^\n]+/g)) {
                lastLine = m[0] || lastLine;
            }
            let mapFile = null;
            for(const m of lastLine.matchAll(/((\/\/)|(\/\*))\s{0,5}(#\s{0,5}sourceMappingURL\s{0,5}\=)(?<map>[^\s]+)/g)) {
                mapFile = m.groups?.map ?? mapFile;
            }
            if (mapFile) {
                const fullMapPath = path.join(dir, mapFile);
                if (existsSync(fullMapPath)) {
                    const json = JSON.parse(await readFile(fullMapPath, "utf-8"));
                    const sources = json?.sources;
                    if (sources?.length === 1) {
                        const mapFileSource = sources[0];
                        const mapFileDir = path.dirname(fullMapPath);
                        const sourceFile = path.join(mapFileDir, mapFileSource);
                        console.log(sourceFile);
                        if (existsSync(sourceFile)) {
                            return sourceFile;
                        }
                    }
                }
            }
        } catch {

        }
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