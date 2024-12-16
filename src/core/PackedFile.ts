import { existsSync, statSync } from "fs";
import { basename, dirname, parse } from "path";

export default abstract class PackedFile {
    readonly dir: string;
    readonly name: string;

    get isEmpty() {
        if (!existsSync(this.path)) {
            return true;
        }
        const s = statSync(this.path);
        return s.size === 0;
    }


    constructor(public path: string) {
        this.dir = dirname(path);
        const p = parse(path);
        this.name = p.base;
    }

    abstract append(src: string): Promise<void>;

    abstract postSave(): Promise<void>;

}