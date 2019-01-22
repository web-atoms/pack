import { join, parse } from "path";
import DeclarationParser from "./DeclarationParser";
import fileApi, { FileApi } from "./FileApi";
import IPackage from "./IPackage";

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
        await fileApi.writeString(outputFile, `
        UMD.packageResolver = function(pkg) {
            pkg.url = "/node_modules/" + pkg.name + "/";
            return pkg;
        };
    `);
        for (const iterator of this.header) {
            await fileApi.appendString(outputFile, iterator + "\r\n");
        }
        for (const iterator of this.content) {
            await fileApi.appendString(outputFile, iterator + "\r\n");
        }
    }

    public async writeFile(f: string, name: string): Promise<void> {

        if (name === "reflect-metadata") {
            f = f + "/Reflect";
        }

        this.done[f] = true;

        const filePath = parse(f);

        const decFile = f + ".d.ts";

        // if there is no declaration file..
        if (await fileApi.exists(decFile)) {

            const packageName = DeclarationParser.packageName(name);

            const d = (await FileApi.instance.readString(decFile));
            const ds = DeclarationParser.parseDependencies(d)
                .map((s) => s.startsWith(".") ? DeclarationParser.resolveRelativePath(s, name) : s)
                .map((s) => s.startsWith(".") ?
                    [
                        this.packageConfig.name === packageName ?
                        join(this.root, s) :
                        join(this.root + "//node_modules//" + packageName, s),
                        s
                    ] :
                    [ this.root + "//node_modules/" + s, s]);

            for (const iterator of ds) {
                if (this.done[iterator[0]]) {
                    continue;
                }

                await this.writeFile(iterator[0], iterator[1]);
            }
        }

        // write file now...
        const fileContent = await fileApi.readString(f + ".js");

        const header = `AmdLoader.instance.get("${name}").package.manifestLoaded = true;`;

        this.header.push(header);

        const content = `
        AmdLoader.current = AmdLoader.instance.get("${name}");
        ${fileContent}
        (function(module) {
            module.loader = new Promise(function(resolve, reject) {
                AmdLoader.current = module;
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
