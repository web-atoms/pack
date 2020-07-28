import { existsSync, readFileSync, readSync } from "fs";
import { format } from "path";
import FileApi from "./FileApi";
import FilePacker from "./FilePacker";
import IPackage from "./IPackage";
import PackageVersion from "./PackageVersion";

const fileApi = new FileApi(".");

export default class Packer {

    public package: IPackage;
    public config: any;

    public async run(args: string[]): Promise<string[]> {

        const root = args[2];
        if (root) {
            process.chdir(root);
        }

        // const files = await FileApi.instance.readDir(
        //     ".",
        //     (f) =>
        //         /^src/i.test(f.path) &&
        //         !/^node\_modules/.test(f.path) && (f.isDirectory || /\.(js|html|xaml)$/.test(f.name)), true);

        // for (const iterator of files) {
        //     console.log(iterator.path);
        // }

        this.package = JSON.parse(await fileApi.readString("package.json"));

        const config = this.config =
            existsSync("waconfig.json")
                ? JSON.parse(await fileApi.readString("waconfig.json"))
                : {};

        if (this.package.dependencies["@web-atoms/core"]) {
            PackageVersion.isV2 = true;
        }

        this.package.pack = config.pack || [];

        const packFiles = this.package.pack;

        // search for all files with text @web-atoms-pack: true

        const list = await fileApi.readDir(".", (f) => {
            if (f.isDirectory) {
                return false;
            }
            if (".js" !== f.ext) {
                return false;
            }
            // if (/\.pack\.js$/.test(f.path)) {
            //     return false;
            // }
            if (/node\_modules/.test(f.dir)) {
                return false;
            }
            const text = readFileSync(format(f), { encoding: "utf8"});
            if (/\/\/\s+\@web\-atoms\-pack\:\s+true/.test(text)) {
                return true;
            }
            return false;
        }, true);

        for (const iterator of list) {
            if (iterator.name.endsWith(".pack")
                || iterator.name.endsWith(".es5")) {
                continue;
            }
            const name = `${iterator.dir}/${iterator.name}`;
            packFiles.push(name);
        }

        for (const iterator of packFiles) {
            console.log(`Packing: ${iterator}`);
        }

        if (!packFiles) {
            return;
        }

        const tasks = packFiles.map( async (file) => {
            const packer = new FilePacker(".", file, this.package);
            await packer.pack();
            return file;
        });
        return await Promise.all(tasks);
    }

}
