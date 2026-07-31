import { Node, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    video: {
      setVideo: (options: { src: string }) => ReturnType;
    };
  }
}

// Node สำหรับวิดีโอที่อัปโหลดขึ้น Supabase Storage เอง (ต่างจาก Youtube extension ที่ฝัง iframe จาก URL ภายนอก)
export const VideoNode = Node.create({
  name: "video",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      src: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "video" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "video",
      mergeAttributes(HTMLAttributes, { controls: "true", class: "rounded-xl w-full" }),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({ type: this.name, attrs: options });
        },
    };
  },
});
