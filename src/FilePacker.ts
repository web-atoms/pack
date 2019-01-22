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

        const outputFile = this.file + ".pack.js";
        await fileApi.writeString(outputFile, ``);
        for (const iterator of this.header) {
            await fileApi.appendString(outputFile, iterator + "\r\n");
        }
        for (const iterator of this.content) {
            await fileApi.appendString(outputFile, iterator + "\r\n");
        }
    }

    public async writeFile(f: string, name: string): Promise<void> {

        this.done[f] = true;
        // console.dir({f , name});
        if (name === "reflect-metadata") {
            f = f + "/Reflect";
        }

        f = f.split("\\").join("/");

        name = name.split("\\").join("/");

        const fileContent = await fileApi.readString(f + ".js");

        const dependencies = DefineVisitor.parse(fileContent);

        // if there is no declaration file..
        if (dependencies && dependencies.length > 0) {

            const packageName = DeclarationParser.packageName(name);

            // const d = (await FileApi.instance.readString(decFile));
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

                console.dir({ ... iterator, packageName, name });

                await this.writeFile(iterator.path, iterator.module.fullPath);
            }
        }

        // write file now...
        const header = `AmdLoader.instance.get("${name}").package.manifestLoaded = true;`;

        this.header.push(header);

        const content = `
        AmdLoader.current = AmdLoader.instance.get("${name}");
        ${fileContent}
        (function(module) {
            module.loader = new Promise(function(resolve, reject) {
                AmdLoader.current = module;
                if (AmdLoader.instance.define)
                    AmdLoader.instance.define();
                module.ready = true;
                if (module.exportVar) {
                    module.exports = AmdLoader.globalVar[module.exportVar];
                }
                module.onReady(function() {
                    resolve(module.getExports());
                });
                module.finish();
            });
        })(AmdLoader.instance.get("${name}"));
`;

        this.content.push(content);
        // this.content.push(name);
        // this.content.push(f);
    }

}
