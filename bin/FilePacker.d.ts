import IPackage from "./IPackage";
export default class FilePacker {
    file: string;
    packageConfig: IPackage;
    content: string[];
    dependencies: string[];
    constructor(file: string, packageConfig: IPackage);
    pack(): Promise<void>;
}
