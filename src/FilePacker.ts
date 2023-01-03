import DeclarationParser from "./DeclarationParser";
import FileApi, { IFileInfo } from "./FileApi";
import IPackage from "./IPackage";
import DefineVisitor from "./parser/DefineVisitor";

import * as Terser from "terser";

import Concat from "concat-with-sourcemaps";
import { RawSourceMap } from "source-map";
import PackageVersion from "./PackageVersion";
import { Stats } from "fs";

export interface IJSFile {
    content: string;
    file?: string;
    fileMTime?: number;
    map?: RawSourceMap;
}

export interface IFileLastModifiedMap {
    [key: string]: number;
}

export default class FilePacker {

    public content: IJSFile[] = [];

    public header: string[] = [];

    public dependencies: string[] = [];

    public done: { [key: string]: boolean } = {};

    public sourceNodes: IJSFile[] = [];

    public appPath: string = "";

    public fileApi: FileApi;

    constructor(
        public root: string,
        public file: string,
        public packageConfig: IPackage) {
        this.fileApi = new FileApi(root);
    }

    public async pack(): Promise<IFileLastModifiedMap> {

        const dependentFiles: IFileLastModifiedMap = {};

        const filePath = this.fileApi.parse(this.file);

        const moduleName = `${this.packageConfig.name}/${filePath.dir}/${filePath.base}`;

        await this.writeFile(this.file, moduleName);

        const outputFile = this.file + ".pack.js";
        const outputFileMin = this.file + ".pack.min.js";

        const umdFile = PackageVersion.isV2
            ? `${this.root}/node_modules/@web-atoms/module-loader/umd.js`
            : `${this.root}/node_modules/web-atoms-amd-loader/umd.js`;

        this.sourceNodes.push(await this.jsFile(umdFile));

        // for (const iterator of this.content) {
        //     await this.fileApi.appendString(outputFile, iterator + "\r\n");
        // }

        // need to add the app...
        if (this.appPath) {
            await this.writeFile(`${this.root}/node_modules/${this.appPath}`, this.appPath);
        }

        // packages
        const packages: string[] = [];
        for (const iterator of this.header) {
            const pn = DeclarationParser.parsePackage(iterator);
            if (!packages.find( (n) => n === pn.name)) {
                packages.push(pn.name);
            }
        }

        this.sourceNodes.push({ content: `
        AmdLoader.instance.register(
            [${ packages.map((s) => JSON.stringify(s)).join(",") }],
            [${ this.header.map((s) => JSON.stringify(s)).join(",") }]);
`});

        for (const iterator of this.content) {
            if (iterator.file) {
                dependentFiles[iterator.file] = iterator.fileMTime;
            }
            this.sourceNodes.push(iterator);
        }

        // now lets do the magic !!

        const concat = new Concat(true, outputFile, "\n");

        // concat.add("none.js", "// web-atoms-packed\n");

        const moduleRoot = this.fileApi.resolve(filePath.dir);

        const absRoot = moduleRoot;

        for (const iterator of this.sourceNodes) {
            const r = iterator.file ? this.fileApi.relative(absRoot, this.fileApi.resolve(iterator.file)) : undefined;
            const map = iterator.map;
            if (map) {
                const ss = map.sources;
                if (ss) {
                    const fileRoot = this.fileApi.parse(this.fileApi.resolve(iterator.file));
                    map.sources =
                        ss.map((s) =>
                            this.fileApi.relative(moduleRoot, this.fileApi.resolve(fileRoot.dir, s)).split("\\")
                            .join("/") );
                }
            }
            concat.add(r, iterator.content, iterator.map);
        }

        const code = `${concat.content}
        //# sourceMappingURL=${filePath.base}.pack.js.map
        `;

        await this.fileApi.writeString(outputFile, code);
        await this.fileApi.writeString(outputFile + ".map", concat.sourceMap);

        // minify...
        const result = await Terser.minify({
            [outputFile]: code
        }, {
            ecma: 2015,
            sourceMap: {
                content: JSON.parse(concat.sourceMap),
                url: filePath.base + ".pack.min.js.map"
            },
            keep_classnames: true,
            mangle: false,
            compress: false
        });

        await this.fileApi.writeString(outputFileMin, result.code);
        await this.fileApi.writeString(outputFileMin + ".map", result.map);

        return dependentFiles;
    }

    public async writeFile(f: string, name: string): Promise<void> {

        if (this.done[f]) {
            return;
        }

        this.done[f] = true;
        if (name === "reflect-metadata") {
            f = f + "/Reflect";
        }

        f = f.split("\\").join("/");

        if (f.endsWith(".js")) {
            f = f.substr(0, f.length - 3);
        }

        name = name.split("\\").join("/");

        if (this.done[name]) {
            return;
        }
        this.done[name] = true;

        this.header.push(name);
        if (/\.(jpg|jpeg|svg|png|json|html|mp4|mp3|gif)$/i.test(name)) {
            return;
        }

        const fileContent = await this.fileApi.readString(f + ".js");

        const dependencies = DefineVisitor.parse(fileContent);

        if (!this.appPath && dependencies) {
            if (dependencies.find((v) => v.toString() === "@web-atoms/core/dist/xf/controls/AtomXFControl")) {
                this.appPath = "@web-atoms/core/dist/xf/XFApp";
            }
            if (dependencies.find((v) => v.toString() === "@web-atoms/core/dist/web/controls/AtomControl")) {
                this.appPath = "@web-atoms/core/dist/web/WebApp";
            }
        }

        if (dependencies && dependencies.length > 0) {

            const ignore = ["reflect_metadata", "global", "tslib"];

            const ds = dependencies
                .map((s) => s.startsWith(".") ? DeclarationParser.resolveRelativePath(s, name) : s)
                .filter((s) => ignore.indexOf(s) === -1 )
                .map((s) => DeclarationParser.parsePackage(s))
                .map((s) =>
                    ({
                        path: this.packageConfig.name === s.name ?
                        this.fileApi.join(this.root, s.path) :
                        this.fileApi.join(this.root + "//node_modules//" + s.name, s.path),
                        module: s
                    }));

            for (const iterator of ds) {
                if (this.done[iterator.path]) {
                    continue;
                }
                await this.writeFile(iterator.path, iterator.module.fullPath);
            }
        }

        this.content.push(await this.jsFile(f + ".js", fileContent));
        this.content.push({ content: `
    AmdLoader.instance.setup("${name}");
`});

    }

    private async jsFile(file, content?: string): Promise<IJSFile> {
        let st: Stats = null;
        if (!content) {
            content = await this.fileApi.readString(file);
        }
        if (file) {
            st = this.fileApi.statSync(file);
        }
        // check last line..
        const lines = content.split("\n")
            .map((s) => s.trim());
        const srcMap = "//# sourceMappingURL=";
        let mapPath: string = "";
        let map: RawSourceMap;
        while (true && lines.length) {
            const last = lines.pop();
            if (last && last.startsWith(srcMap)) {
                mapPath = last.substr(srcMap.length);
                break;
            }
        }
        if (mapPath) {
            const parsedPath = this.fileApi.parse(file);
            mapPath = this.fileApi.join(parsedPath.dir, mapPath);
            if (await this.fileApi.exists(mapPath)) {
                mapPath = await this.fileApi.readString(mapPath);
                map = JSON.parse(mapPath);
            }
        }

        return {
            file,
            content,
            fileMTime: st ? st.mtimeMs : 0,
            map
        };
    }

}
