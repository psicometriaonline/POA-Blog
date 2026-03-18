import { CodeBlockLowlight } from "@tiptap/extension-code-block-lowlight";

export function createCustomCodeBlockExtension(lowlight: any) {
  return CodeBlockLowlight.extend({
    addAttributes() {
      return {
        ...this.parent?.(),
        dataStart: {
          default: 1,
          parseHTML: (element) => {
            const dataStart = element.getAttribute("data-start");
            return dataStart ? parseInt(dataStart) : 1;
          },
          renderHTML: (attributes) => {
            if (attributes.dataStart && attributes.dataStart !== 1) {
              return { "data-start": String(attributes.dataStart) };
            }
            return {};
          },
        },
      };
    },
  }).configure({
    lowlight,
    defaultLanguage: "r",
  });
}
