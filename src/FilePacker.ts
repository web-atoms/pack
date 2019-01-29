import { builders } from "ast-types";
import { join, parse } from "path";
import * as recast from "recast";
import DeclarationParser from "./DeclarationParser";
import fileApi, { FileApi } from "./FileApi";
import IPackage from "./IPackage";
import DefineVisitor from "./parser/DefineVisitor";

export default class FilePacker {

    public content: any[] = [];

    public header: string[] = [];

    public dependencies: string[] = [];

    public done: { [key: string]: boolean } = {};

    public sourceNodes: any[] = [];

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

        const umd = await fileApi.readString(`${this.root}/node_modules/web-atoms-amd-loader/umd.js`);

        this.sourceNodes.push(recast.parse(umd, { sourceFileName: "./node_modules/web-atoms-amd-loader/umd.js" }));

        this.sourceNodes.push(recast.parse(`
        AmdLoader.instance.register(
            [${ packages.map((s) => JSON.stringify(s)).join(",") }],
            [${ this.header.map((s) => JSON.stringify(s)).join(",") }]);
`));
        // for (const iterator of this.content) {
        //     await fileApi.appendString(outputFile, iterator + "\r\n");
        // }

        for (const iterator of this.content) {
            this.sourceNodes.push(iterator);
        }

        // now lets do the magic !!

        const list = [];
        for (const iterator of this.sourceNodes) {
            for (const body of iterator.program.body) {
                list.push(body);
            }
        }

        const code = builders.program(list);

        const result = recast.print(code, { sourceMapName: `${outputFile}.map.json` });

        await fileApi.writeString(outputFile, `${result.code}
//# sourceMappingURL=${outputFile}.map.json
`);
        await fileApi.writeString(outputFile + ".map.json", JSON.stringify(result.map));
    }

    public async writeFile(f: string, name: string): Promise<void> {

        this.done[f] = true;
        if (name === "reflect-metadata") {
            f = f + "/Reflect";
        }

        f = f.split("\\").join("/");

        name = name.split("\\").join("/");

        const fileContent = await fileApi.readString(f + ".js");

        const ast = recast.parse(fileContent, { sourceFileName: f + ".js" });

        const dependencies = DefineVisitor.parse(ast.program.body);

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

        this.content.push(ast);
        this.content.push(recast.parse(`
    AmdLoader.instance.setup("${name}");
`));

//         const content = `${fileContent}
// AmdLoader.instance.setup("${name}");
// `;
//         this.content.push(content);
    }

}
