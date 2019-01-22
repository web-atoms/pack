import { Assert } from "web-atoms-core/dist/unit/Assert";
import { Test } from "web-atoms-core/dist/unit/Test";
import { TestItem } from "web-atoms-core/dist/unit/TestItem";
import DeclarationParser from "../DeclarationParser";

export default class DeclarationTest extends TestItem {

    @Test
    public parse(): void {
        let r = DeclarationParser.parseDependencies(`
        import "a";
        `);

        Assert.equals("a", r[0]);

        r = DeclarationParser.parseDependencies(`
        import a from "a";
        `);

        Assert.equals("a", r[0]);

        r = DeclarationParser.parseDependencies(`
        import { a } from "a";
        `);

        Assert.equals("a", r[0]);
    }

    @Test
    public parsePackage(): void {
        let p = DeclarationParser.parsePackage("web-atoms-core/dist/Atom");
        Assert.equals("web-atoms-core", p.name);
        Assert.equals("dist/Atom", p.path);

        p = DeclarationParser.parsePackage("@c8private/core/dist/Atom");
        Assert.equals("@c8private/core", p.name);
        Assert.equals("dist/Atom", p.path);
    }
}
