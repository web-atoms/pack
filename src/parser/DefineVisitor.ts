import { parse, Node } from "acorn";
import { simple } from "acorn-walk";
import PackageVersion from "../PackageVersion";

function inspectDefine(e, dependencies: string[]): void {
    const id = e.callee;
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

    dependencies.push(... a.elements
        .filter((el, i) => i > 1)
        .map((el) => el.type === "Literal" ? el.value.toString() : undefined));
}

function inspectRegister(e, dependencies: string[]): void {
    const id = e.callee;
    if (!(id && id.type === "MemberExpression"
        && id.property?.name === "register"
        && id.object?.name === "System")) {
        return;
    }
    const a = e.arguments[0];
    if (!(a && a.type === "ArrayExpression")) {
        return;
    }

    dependencies.push(... a.elements
        .map((el) => el.type === "Literal" ? el.value.toString() : undefined));
}

function inspectDynamicImport(e, dependencies: string[]) {
    const id = e.callee;
    if (!(id && id.type === "MemberExpression"
        && id.property?.name === "import"
        && id.object?.name === "_context")) {
        return;
    }
    const a = e.arguments[0];
    if (a.type === "Literal") {
        dependencies.push(a.value.toString());
    }
}

export default class DefineVisitor {

    public static parse(tree: Node | string): string[] {
        if (typeof tree === "string") {
            tree = parse(tree, { ecmaVersion: 2019 });
        }
        const result: string[] = [];
        simple(tree, {
            CallExpression(e) {
                inspectDefine(e, result);
                inspectRegister(e, result);
                inspectDynamicImport(e, result);
            }
        });
        return result;
    }

    // private dependencies: string[] = null;

    // constructor(tree: Node) {
    //     super(tree);
    // }

    // public define(): string[] {

    //     this.visit(this.tree);

    //     if (!this.dependencies) {
    //         return this.dependencies;
    //     }

    //     if (PackageVersion.isV2) {
    //         return [
    //             "@web-atoms/core/dist/Atom",
    //             "@web-atoms/core/dist/core/AtomList",
    //             ... this.dependencies];
    //         }

    //     return [
    //         "web-atoms-core/dist/Atom",
    //         "web-atoms-core/dist/core/AtomList",
    //         ... this.dependencies];
    // }

    // public callExpression(e: CallExpression): Node | Node[] {

    //     if (!this.dependencies) {
    //         this.inspectDefine(e);
    //     }
    //     return this.expression(e);
    // }

    // private inspectDefine(e: CallExpression): void {
    //     const id = e.callee as Identifier;
    //     if (!(id && id.type === "Identifier" && id.name === "define")) {
    //         return;
    //     }
    //     const a = e.arguments[0];
    //     if (!(a && a.type === "ArrayExpression")) {
    //         return;
    //     }
    //     const [req, exp] = a.elements;
    //     if (!(req && req.type === "Literal" && req.value === "require")) {
    //         return;
    //     }
    //     if (!(exp && exp.type === "Literal" && exp.value === "exports")) {
    //         return;
    //     }

    //     this.dependencies = a.elements
    //         .filter((el, i) => i > 1)
    //         .map((el) => el.type === "Literal" ? el.value.toString() : undefined);
    // }

}
