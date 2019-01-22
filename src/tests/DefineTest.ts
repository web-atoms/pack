import { parseScript } from "esprima";
import { Test } from "web-atoms-core/dist/unit/Test";
import { TestItem } from "web-atoms-core/dist/unit/TestItem";
import DefineVisitor from "../parser/DefineVisitor";

const script = `(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports",
        "web-atoms-core/dist/web/controls/AtomTabbedPage",
        "web-atoms-core/dist/web/controls/AtomGridView",
        "../../view-models/AppHostViewModel",
        "./MenuList", "../../images/github/GitHubMark32px", "../styles/AppTabStyle"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
});`;

export default class DefineTest extends TestItem {

    @Test
    public test(): void {
        const d = DefineVisitor.parse(script);

        console.dir(d, { depth: 10 });
    }

}
