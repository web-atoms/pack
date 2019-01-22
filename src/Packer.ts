import fileApi from "./FileApi";
import FilePacker from "./FilePacker";
import IPackage from "./IPackage";

export default class Packer {

    public package: IPackage;
    public config: any;

    public async run(args: string[]): Promise<void> {

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

        const config = this.config = JSON.parse(await fileApi.readString("waconfig.json"));

        this.package.pack = config.pack || [];

        const packFiles = this.package.pack;
        if (!packFiles) {
            return;
        }

        const tasks = packFiles.map( async (file) => {
            const packer = new FilePacker(".", file, this.package);
            await packer.pack();
        });
        await Promise.all(tasks);

    }

}
