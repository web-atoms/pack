export default interface IPackage {

    name: string;
    version: string;

    dependencies?: {
        [key: string]: string;
    };

    pack?: string[];

}
