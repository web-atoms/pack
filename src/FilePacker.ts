import { join, parse } from "path";
import DeclarationParser from "./DeclarationParser";
import fileApi, { FileApi } from "./FileApi";
import IPackage from "./IPackage";
import DefineVisitor from "./parser/DefineVisitor";

export default class FilePacker {

    public content: string[] = [];

    public header: string[] = [];

    public dependencies: string[] = [];

    public done: { [key: string]: boolean } = {};

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

        await fileApi.writeString(outputFile, "");
        await fileApi.appendString(outputFile, umd + "\r\n");
        await fileApi.appendString(outputFile, `
        AmdLoader.instance.register(
            [${ packages.map((s) => JSON.stringify(s)).join(",") }],
            [${ this.header.map((s) => JSON.stringify(s)).join(",") }]);
`);
        for (const iterator of this.content) {
            await fileApi.appendString(outputFile, iterator + "\r\n");
        }
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

        const content = `${fileContent}
AmdLoader.instance.setup("${name}");
`;
        this.content.push(content);
    }

}
