import { join, parse } from "path";
import DeclarationParser from "./DeclarationParser";
import fileApi, { FileApi } from "./FileApi";
import IPackage from "./IPackage";
import DefineVisitor from "./parser/DefineVisitor";

import Concat from "concat-with-sourcemaps";

export interface IJSFile {
    content: string;
    file?: string;
    map?: string;
}

async function jsFile(file, content?: string): Promise<IJSFile> {
    if (!content) {
        content = await fileApi.readString(file);
    }
    // check last line..
    const lines = content.split("\n")
        .map((s) => s.trim());
    const srcMap = "//# sourceMappingURL=";
    let map: string = "";
    while (true && lines.length) {
        const last = lines.pop();
        if (last && last.startsWith(srcMap)) {
            map = last.substr(srcMap.length);
            break;
        }
    }
    if (map) {
        const parsedPath = parse(file);
        map = join(parsedPath.dir, map);
        if (await fileApi.exists(map)) {
            map = await fileApi.readString(map);
        }
    }

    return {
        file,
        content,
        map: map || undefined
    };
}

export default class FilePacker {

    public content: IJSFile[] = [];

    public header: string[] = [];

    public dependencies: string[] = [];

    public done: { [key: string]: boolean } = {};

    public sourceNodes: IJSFile[] = [];

    constructor(
        public root: string,
        public file: string,
        public packageConfig: IPackage) {

    }

    public async pack(): Promise<void> {

        const filePath = parse(this.file);
        const moduleName = `${this.packageConfig.name}/${filePath.dir}/${filePath.base}`;

        await this.writeFile(this.file, moduleName);

        // packages
        const packages: string[] = [];
        for (const iterator of this.header) {
            const pn = DeclarationParser.parsePackage(iterator);
            if (!packages.find( (n) => n === pn.name)) {
                packages.push(pn.name);
            }
        }

        const outputFile = this.file + ".pack.js";

        const umdFile = `${this.root}/node_modules/web-atoms-amd-loader/umd.js`;

        this.sourceNodes.push(await jsFile(umdFile));

        this.sourceNodes.push({ content: `
        AmdLoader.instance.register(
            [${ packages.map((s) => JSON.stringify(s)).join(",") }],
            [${ this.header.map((s) => JSON.stringify(s)).join(",") }]);
`});
        // for (const iterator of this.content) {
        //     await fileApi.appendString(outputFile, iterator + "\r\n");
        // }

        for (const iterator of this.content) {
            this.sourceNodes.push(iterator);
        }

        // now lets do the magic !!

        const concat = new Concat(true, outputFile, "\n");

        for (const iterator of this.sourceNodes) {
            concat.add(iterator.file, iterator.content, iterator.map);
        }

        await fileApi.writeString(outputFile, `${concat.content}
//# sourceMappingURL=${filePath.base}.pack.js.map
`);
        await fileApi.writeString(outputFile + ".map", JSON.stringify(concat.sourceMap));
    }

    public async writeFile(f: string, name: string): Promise<void> {

        this.done[f] = true;
        if (name === "reflect-metadata") {
            f = f + "/Reflect";
        }

        f = f.split("\\").join("/");

        name = name.split("\\").join("/");

        const fileContent = await fileApi.readString(f + ".js");

        const dependencies = DefineVisitor.parse(fileContent);

        if (dependencies && dependencies.length > 0) {

            const ds = dependencies
                .map((s) => s.startsWith(".") ? DeclarationParser.resolveRelativePath(s, name) : s)
                .map((s) => DeclarationParser.parsePackage(s))
                .map((s) =>
                    ({
                        path: this.packageConfig.name === s.name ?
                        join(this.root, s.path) :
                        join(this.root + "//node_modules//" + s.name, s.path),
                        module: s
                    }));

            for (const iterator of ds) {
                if (this.done[iterator.path]) {
                    continue;
                }
                await this.writeFile(iterator.path, iterator.module.fullPath);
            }
        }

        this.header.push(name);

        this.content.push(await jsFile(f, fileContent));
        this.content.push({ content: `
    AmdLoader.instance.setup("${name}");
`});

    }

}
