import { access, appendFile, constants, fstat, readdir, readFile, stat, Stats, writeFile } from "fs";
import * as path_1 from "path";

export interface IFileInfo extends path_1.ParsedPath {
    isDirectory?: boolean;
    length?: number;
}

export default class FileApi {

    constructor(public readonly root: string) {

    }

    // public static instance: FileApi = new FileApi();

    public parse(path: string): IFileInfo {
        return path_1.parse(path);
    }

    public join(p1: string, p2: string): string {
        return path_1.join(p1, p2);
    }

    public resolve(... path: string[]): string {
        if (path.length === 1) {
            return path_1.resolve(this.root, path[0]);
        }
        return path_1.resolve( ... path);
    }

    public relative(path1: string, path2: string): string {
        return path_1.relative(path1, path2);
    }

    public readString(path: string): Promise<string> {
        path = this.resolve(path);
        return new Promise<string>((resolve, reject) => {
            readFile(path, "utf8", (err, data) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(data);
            });
        });
    }

    public appendString(path: string, data: string): Promise<void> {
        path = this.resolve(path);
        return new Promise<void>((resolve, reject) => {
            appendFile(path, data, "utf8", (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            } );
        });
    }

    public writeString(path: string, data: string | any): Promise<void> {
        path = this.resolve(path);
        if (typeof data !== "string") {
            data = JSON.stringify(data);
        }
        return new Promise<void>((resolve, reject) => {
            writeFile(path, data, "utf8", (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            } );
        });
    }

    public exists(path: string): Promise<boolean> {
        path = this.resolve(path);
        return new Promise<boolean>((resolve, reject) => {
            access(path, constants.F_OK, (error) => {
                resolve(!error);
            });
        });
    }

    public async writeOnlyIfChanged(path: string, content: string): Promise<void> {
        path = this.resolve(path);
        if (await this.exists(path)) {
            const existing = await this.readString(path);
            if (existing === content) {
                return;
            }
            if (this.flat(existing) === this.flat(content)) {
                return;
            }
        }
        await this.writeString(path, content);
    }

    public stat(file: string): Promise<Stats> {
        file = this.resolve(file);
        const filePath = file;
        return new Promise<Stats>((resolve, reject) => {
            stat(filePath, (error, result) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(result);
            });
        });
    }

    public async readDir(
        folder: string | IFileInfo,
        filter: (file: IFileInfo) => boolean = (file) => true,
        nest: boolean = false
    ): Promise<IFileInfo[]> {
        const filePath = typeof folder === "string" ? folder : path_1.format(folder);

        // read file names
        const result = await new Promise<IFileInfo[]>((resolve, reject) => {
            readdir(this.resolve(filePath), (error, files: string[]) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(files.map((s) => ({
                    ... path_1.parse(path_1.join(filePath, s))
                })));
            });
        });

        let all: IFileInfo[] = [];

        await Promise.all( result.map( async (iterator) => {
            const fstat1 = await this.stat(path_1.format(iterator));
            const path = iterator;
            iterator.length = fstat1.size;
            iterator.isDirectory = fstat1.isDirectory();
            iterator.ext = path.ext;
            iterator.dir = path.dir;
            iterator.name = path.name;

            if (iterator.isDirectory && nest) {
                const children = await this.readDir(iterator, filter, true);
                all = all.concat(children);
            } else {
                if (filter(iterator)) {
                    all.push(iterator);
                }
            }

            }));
        return all;

    }

    private flat(content: string): string {
        return content
            .split("\n")
            .map((s) => s.trimRight())
            .join("\n");
    }
}

// const fileApi = FileApi.instance;

// export default ;
