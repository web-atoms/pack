import fileApi from "./FileApi";
import IPackage from "./IPackage";

export default class FilePacker {

    public content: string[] = [];

    public dependencies: string[] = [];

    constructor(
        public file: string,
        public packageConfig: IPackage) {

    }

    public async pack(): Promise<void> {
        const input = (await fileApi.readString(this.file + ".d.ts"))
            .split("\n")
            .map((s) => s.trim());

        // pack modules...

    }

}
