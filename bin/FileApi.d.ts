/// <reference types="node" />
import { Stats } from "fs";
export interface IFileInfo {
    dir?: string;
    nameWithoutExtension?: string;
    name: string;
    ext?: string;
    path: string;
    isDirectory?: boolean;
    length?: number;
}
export declare class FileApi {
    static instance: FileApi;
    readString(path: string): Promise<string>;
    writeString(path: string, data: string): Promise<void>;
    exists(path: string): Promise<boolean>;
    writeOnlyIfChanged(path: string, content: string): Promise<void>;
    stat(file: string | IFileInfo): Promise<Stats>;
    readDir(folder: string | IFileInfo, filter?: (file: IFileInfo) => boolean, nest?: boolean): Promise<IFileInfo[]>;
    private flat(content);
}
declare const fileApi: FileApi;
export default fileApi;
