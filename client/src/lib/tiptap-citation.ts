import { Node, mergeAttributes } from "@tiptap/core";

export const CitationBox = Node.create({
  name: "citationBox",
  group: "block",
  content: "block+",
  defining: true,

  parseHTML() {
    return [
      {
        tag: 'div.citation-box',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: "citation-box" }),
      0,
    ];
  },

  addCommands() {
    return {
      toggleCitationBox:
        () =>
        ({ commands }: any) => {
          return commands.toggleWrap(this.name);
        },
      insertCitationBox:
        () =>
        ({ commands }: any) => {
          return commands.insertContent({
            type: this.name,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Insira a referência aqui" }],
              },
            ],
          });
        },
    } as any;
  },
});
