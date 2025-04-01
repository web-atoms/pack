export interface IPackageInfo {
    name: string;
    path: string;
    fullPath: string;
}
export default class DeclarationParser {

    public static parsePackage(name: string): IPackageInfo {
        let path: string;
        name = name.split("\\").join("/");
        const tokens = name.split("/");
        if (tokens[0].startsWith("@")) {
            name = [tokens[0], tokens[1]].join("/");
            path = tokens.filter((s, i) => i > 1).join("/");
        } else {
            name = tokens[0];
            path = tokens.filter((s, i) => i > 0).join("/");
        }
        return {
            name,
            path,
            fullPath: path ? `${name}/${path}` : name
        };
    }

    public static packageName(name: string): string {
        const tokens = name.split("/", 3);
        if (tokens[0].startsWith("@")) {
            return [tokens[0], tokens[1]].join("/");
        }
        return tokens[0];
    }

    public static parseDependencies(content: string): string[] {
        const dependencies: string[] = [];
        const lines = content.split("\n").map((s) => s.trim());
        for (const line of lines) {
            if (/^import\s/.test(line)) {
                let i = line.lastIndexOf("\"");
                let s = line.substring(0, i);
                i = s.lastIndexOf("\"");
                s = s.substring(i + 1);

                dependencies.push(s);
            }
        }
        return dependencies;
    }

    public static resolveRelativePath(name: string, currentPackage: string): string {

        if (name.charAt(0) !== ".") {
            return name;
        }

        const tokens: string[] = name.split("/");

        const currentTokens: string[] = currentPackage.split("/");

        currentTokens.pop();

        while (tokens.length) {
            const first = tokens[0];
            if (first === "..") {
                currentTokens.pop();
                tokens.splice(0, 1);
                continue;
            }
            if (first === ".") {
                tokens.splice(0, 1);
            }
            break;
        }

        return `${currentTokens.join("/")}/${tokens.join("/")}`;
    }

}
