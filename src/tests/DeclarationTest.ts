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
}
