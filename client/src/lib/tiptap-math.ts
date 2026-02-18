import { Node, mergeAttributes } from "@tiptap/core";

export const MathInline = Node.create({
  name: "mathInline",
  group: "inline",
  inline: true,
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="math-inline"]',
        getAttrs: (dom: HTMLElement) => ({
          latex: dom.getAttribute("data-latex") || dom.textContent || "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "span",
      {
        "data-type": "math-inline",
        "data-latex": node.attrs.latex,
        class: "math-inline",
      },
      node.attrs.latex,
    ];
  },

  addCommands() {
    return {
      insertMathInline:
        (latex: string) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    } as any;
  },
});

export const MathBlock = Node.create({
  name: "mathBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      latex: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="math-block"]',
        getAttrs: (dom: HTMLElement) => ({
          latex: dom.getAttribute("data-latex") || dom.textContent || "",
        }),
      },
    ];
  },

  renderHTML({ node }) {
    return [
      "div",
      {
        "data-type": "math-block",
        "data-latex": node.attrs.latex,
        class: "math-block",
      },
      node.attrs.latex,
    ];
  },

  addCommands() {
    return {
      insertMathBlock:
        (latex: string) =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            attrs: { latex },
          });
        },
    } as any;
  },
});
