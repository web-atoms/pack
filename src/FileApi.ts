import { access, constants, fstat, readdir, readFile, stat, Stats, writeFile } from "fs";
import { join, parse } from "path";

export interface IFileInfo {
    dir?: string;
    nameWithoutExtension?: string;
    name: string;
    ext?: string;
    path: string;
    isDirectory?: boolean;
    length?: number;
}

export class FileApi {

    public static instance: FileApi = new FileApi();

    public readString(path: string): Promise<string> {
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

    public writeString(path: string, data: string): Promise<void> {
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
        return new Promise<boolean>((resolve, reject) => {
            access(path, constants.F_OK, (error) => {
                resolve(!error);
            });
        });
    }

    public async writeOnlyIfChanged(path: string, content: string): Promise<void> {
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

    public stat(file: string | IFileInfo): Promise<Stats> {
        const fpath = typeof file === "string" ? file : file.path;
        return new Promise<Stats>((resolve, reject) => {
            stat(fpath, (error, result) => {
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
        const fpath = typeof folder === "string" ? folder : folder.path;

        // read file names
        const result = await new Promise<IFileInfo[]>((resolve, reject) => {
            readdir(fpath, (error, files: string[]) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(files.map((s) => ({
                    name: s,
                    path: join(fpath, s)
                })));
            });
        });

        let all: IFileInfo[] = [ ... result.filter(filter) ];

        await Promise.all( result.map( async (iterator) => {
            const fstat1 = await this.stat(iterator);
            const path = parse(iterator.path);
            iterator.length = fstat1.size;
            iterator.isDirectory = fstat1.isDirectory();
            iterator.ext = path.ext;
            iterator.dir = path.dir;
            iterator.nameWithoutExtension = path.name;

            if (iterator.isDirectory && nest) {
                const children = await this.readDir(iterator, filter, true);
                all = all.concat(children);
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

const fileApi = FileApi.instance;

export default fileApi;
