import { parseScript, Program } from "esprima";
import { CallExpression, Identifier, Node } from "estree";
import TreeVisitor from "./TreeVisitor";
import PackageVersion from "../PackageVersion";

export default class DefineVisitor extends TreeVisitor {

    public static parse(tree: Node | string): string[] {
        if (typeof tree === "string") {
            tree = parseScript(tree, { tolerant: true });
        }
        const d = new DefineVisitor(tree);
        return  d.define();
    }

    private dependencies: string[] = null;

    constructor(tree: Node) {
        super(tree);
    }

    public define(): string[] {

        this.visit(this.tree);

        if (!this.dependencies) {
            return this.dependencies;
        }

        if (PackageVersion.isV2) {
            return [
                "@web-atoms/core/dist/Atom",
                "@web-atoms/core/dist/core/AtomList",
                "@web-atoms/core/dist/web/WebApp",
                ... this.dependencies];
            }

        return [
            "web-atoms-core/dist/Atom",
            "web-atoms-core/dist/core/AtomList",
            "web-atoms-core/dist/web/WebApp",
            ... this.dependencies];
    }

    public callExpression(e: CallExpression): Node | Node[] {

        if (!this.dependencies) {
            this.inspectDefine(e);
        }
        return this.expression(e);
    }

    private inspectDefine(e: CallExpression): void {
        const id = e.callee as Identifier;
        if (!(id && id.type === "Identifier" && id.name === "define")) {
            return;
        }
        const a = e.arguments[0];
        if (!(a && a.type === "ArrayExpression")) {
            return;
        }
        const [req, exp] = a.elements;
        if (!(req && req.type === "Literal" && req.value === "require")) {
            return;
        }
        if (!(exp && exp.type === "Literal" && exp.value === "exports")) {
            return;
        }

        this.dependencies = a.elements
            .filter((el, i) => i > 1)
            .map((el) => el.type === "Literal" ? el.value.toString() : undefined);
    }

}
