import IPackage from "./IPackage";
export default class Packer {
    package: IPackage;
    config: any;
    run(args: string[]): Promise<void>;
}
