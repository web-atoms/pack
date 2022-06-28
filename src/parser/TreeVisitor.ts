import { Node } from "acorn";

function isString(stringToCheck): boolean {
    if (stringToCheck.constructor === String) {
      return true;
    }
    return typeof stringToCheck === "string" || stringToCheck instanceof String;
}

function walk(tree, f, parent?, name?): void {
    if (tree.length !== undefined) {
        let index = 0;
        for (const item of tree) {
            if (item) {
                walk(item , f, tree, index++);
            }
        }
        return;
    }
    for (const i in tree) {
        if (!tree.hasOwnProperty(i)) {
            continue;
        }
        if (/^(parent|parentfield|tree)$/i.test(i)) {
            continue;
        }
        const v = tree[i];
        if (v && v !== tree) {
            if (isString(v)) {
                continue;
            }
            if (v.type !== undefined || v.length !== undefined) {
                walk(v, f, tree, i);
            }
        }
    }
    f(tree, parent, name);
}

function prepareDom(node, tree) {
    walk(node, (item, parent, name) => {
        item.parent = parent;
        item.parentField = name;
        if (tree) {
          item.tree = tree;
        }
    });
}

export default class TreeVisitor {

    constructor(public readonly tree: Node) {
        prepareDom(this.tree, this.tree);
    }

    protected walk(
        node: Node,
        f: ((item: Node, parent, name) => void) ): void {
        walk(node, f);
    }

    protected visit(e): Node | Node[] {
        if (!e) {
          return e;
        }
        let type = e.type;
        if (type) {
          type = type.substr(0, 1).toLowerCase() + type.substr(1);
          const visitor = this[type] || this.expression;
          return visitor.call(this, e);
        }
        if (e.length) {
          const list = [];
          for (const item of e) {
            list.push(this.visit(item));
          }
          return list;
        }
        return e;
    }

    protected expression(e): Node | Node[] {
        // console.log('default expression ' + e.type);
        for (const i in e) {
          if (/parent|tree/i.test(i)) {
            continue;
          }
          const v = e[i];
          if (!v) {
            continue;
          }
          if (isString(v)) {
            continue;
          }
          e[i] = this.visit(v);
        }
        return e;
      }

}
