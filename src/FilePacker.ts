import DeclarationParser, { IPackageInfo } from "./DeclarationParser";
import FileApi, { IFileInfo } from "./FileApi";
import IPackage from "./IPackage";
import DefineVisitor from "./parser/DefineVisitor";

import * as Terser from "terser";

import Concat from "concat-with-sourcemaps";
import { RawSourceMap } from "source-map";
import PackageVersion from "./PackageVersion";
import { Stats } from "fs";
import PackedLessFile from "./core/PackedLessFile";
import PackedFile from "./core/PackedFile";
import PackedCssFile from "./core/PackedCssFile";

export interface IJSFile {
    content: string;
    file?: string;
    fileMTime?: number;
    map?: RawSourceMap;
}

interface ILessFile {
    path: string;
    module: IPackageInfo;
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

    public lessNodes = {
        global: void 0 as PackedLessFile,
        local:  void 0 as PackedLessFile,
        globalHigh:  void 0 as PackedLessFile,
        localHigh:  void 0 as PackedLessFile,
        globalLow:  void 0 as PackedLessFile,
        localLow:  void 0 as PackedLessFile
    };

    public cssNodes = {
        global: void 0 as PackedCssFile,
        local:  void 0 as PackedCssFile,
        globalHigh:  void 0 as PackedCssFile,
        localHigh:  void 0 as PackedCssFile,
        globalLow:  void 0 as PackedCssFile,
        localLow:  void 0 as PackedCssFile
    };

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

        // let us import style sheets first...

        const wait = [];

        for (const key in this.lessNodes) {
            if (Object.hasOwn(this.lessNodes, key)) {
                const element = this.lessNodes[key] as PackedFile;
                if (element && !element.isEmpty) {
                    wait.push(element.postSave());

                    this.sourceNodes.push({ content: `window.installStyleSheet( new URL("./${filePath.base}.pack.${key}.less.css", document.currentScript.src).toString());`});
                }
            }
        }

        for (const key in this.cssNodes) {
            if (Object.hasOwn(this.cssNodes, key)) {
                const element = this.cssNodes[key] as PackedFile;
                if (element && !element.isEmpty) {
                    wait.push(element.postSave());

                    this.sourceNodes.push({ content: `window.installStyleSheet( new URL("./${filePath.base}.pack.${key}.css", document.currentScript.src).toString());`});
                }
            }
        }

        await Promise.all(wait);
        

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
            concat.add(r, iterator.content, iterator.map as any);
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
            f = f.substring(0, f.length - 3);
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

            const ignore = ["reflect-metadata", "global", "tslib"];

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
                const { path } = iterator;
                if (this.done[path]) {
                    continue;
                }
                if (path.endsWith(".less")) {
                    let name = "global";
                    // inject css...
                    if(path.endsWith(".global-low.less")) {
                        name = "globalLow";
                    }
                    if(path.endsWith(".global-high.less")) {
                        name = "globalHigh";
                    }
                    if(path.endsWith(".local.less")) {
                        name = "local";
                    }
                    if(path.endsWith(".local-low.less")) {
                        name = "localLow";
                    }
                    if(path.endsWith(".local-high.less")) {
                        name = "localHigh";
                    }
                    const less = (this.lessNodes[name] ??= new PackedLessFile(`${this.file}.pack.${name}.less`)) as PackedLessFile;
                    await less.append(path);
                    this.done[path] = true;
                    continue;
                }
                if (path.endsWith(".css")) {
                    let name = "global";
                    // inject css...
                    if(path.endsWith(".global-low.css")) {
                        name = "globalLow";
                    }
                    if(path.endsWith(".global-high.css")) {
                        name = "globalHigh";
                    }
                    if(path.endsWith(".local.css")) {
                        name = "local";
                    }
                    if(path.endsWith(".local-low.css")) {
                        name = "localLow";
                    }
                    if(path.endsWith(".local-high.css")) {
                        name = "localHigh";
                    }
                    const css = (this.cssNodes[name] ??= new PackedCssFile(`${this.file}.pack.${name}.css`)) as PackedCssFile;
                    await css.append(path);
                    this.done[path] = true;
                    continue;
                }
                await this.writeFile(path, iterator.module.fullPath);
            }
        }

        this.content.push({ content: `
    AmdLoader.instance.setup("${name}");
`});
        this.content.push(await this.jsFile(f + ".js", fileContent));
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
                mapPath = last.substring(srcMap.length);
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
