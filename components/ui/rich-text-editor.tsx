"use client";

import { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TiptapImage from "@tiptap/extension-image";
import Youtube, { isValidYoutubeUrl } from "@tiptap/extension-youtube";
import { VideoNode } from "./tiptap-video-extension";
import {
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  ImagePlus,
  Clapperboard,
  FileVideo,
  Undo2,
  Redo2,
  Code2,
} from "lucide-react";
import { uploadDescriptionImage, uploadDescriptionVideo } from "@/lib/actions/admin";

function ToolbarButton({
  onClick,
  active,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={active}
      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition disabled:opacity-30 ${
        active ? "bg-primary text-ink" : "text-ink/60 hover:bg-lane/60"
      }`}
    >
      {children}
    </button>
  );
}

export function RichTextEditor({
  name,
  defaultValue,
}: {
  name: string;
  defaultValue?: string | null;
}) {
  const [html, setHtml] = useState(defaultValue ?? "");
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceDraft, setSourceDraft] = useState("");

  const editor = useEditor({
    extensions: [
      StarterKit,
      TiptapImage.configure({
        HTMLAttributes: { class: "rounded-xl" },
      }),
      Youtube.configure({
        width: 640,
        height: 360,
        nocookie: true,
        HTMLAttributes: { class: "rounded-xl" },
      }),
      VideoNode,
    ],
    content: defaultValue ?? "",
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      setHtml(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-[160px] rounded-xl border border-lane bg-white px-3 py-2.5 focus:outline-none focus:border-primary",
      },
    },
  });

  if (!editor) return null;

  const toggleSourceMode = () => {
    if (sourceMode) {
      // ออกจากโหมดโค้ด — เอา HTML ที่พิมพ์กลับไปให้ editor parse ตาม schema
      // (tag/attribute ที่ไม่รู้จักจะถูกตัดทิ้งเองตรงนี้ ก่อนถึง sanitize อีกชั้นตอน save)
      editor.commands.setContent(sourceDraft);
      setSourceMode(false);
    } else {
      setSourceDraft(editor.getHTML());
      setSourceMode(true);
    }
  };

  const handleImagePick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("image_file", file);
      try {
        const url = await uploadDescriptionImage(formData);
        if (url) editor.chain().focus().setImage({ src: url }).run();
      } catch {
        // upload ล้มเหลว — เงียบไว้ ไม่บล็อกการแก้ไขต่อ (เหมือน pattern อื่นของ editor นี้)
      }
    };
    input.click();
  };

  const handleYoutubeEmbed = () => {
    const url = window.prompt("วางลิงก์วิดีโอ YouTube");
    if (!url) return;
    if (!isValidYoutubeUrl(url)) {
      window.alert("ลิงก์นี้ไม่ใช่ YouTube ที่ใช้ฝังได้ ลองใหม่อีกครั้ง");
      return;
    }
    editor.chain().focus().setYoutubeVideo({ src: url }).run();
    // วิดีโอ/iframe เป็น block ที่ไม่รับ text cursor ตามปกติ — หลังแทรกแล้ว selection มักค้างเป็น
    // NodeSelection ครอบตัว node นั้น ถ้าไม่ขยับออกมาก่อน พิมพ์ต่อจะเท่ากับ "แทนที่" node ทิ้งไปเลย
    editor.chain().focus("end").run();
  };

  const handleVideoUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/mp4,video/webm";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const formData = new FormData();
      formData.append("video_file", file);
      try {
        const url = await uploadDescriptionVideo(formData);
        if (url) {
          editor.chain().focus().setVideo({ src: url }).run();
          // เหตุผลเดียวกับตอนแทรก YouTube — กันไม่ให้ NodeSelection ค้างแล้วพิมพ์ทับวิดีโอทิ้ง
          editor.chain().focus("end").run();
        }
      } catch {
        // upload ล้มเหลว — เงียบไว้ ไม่บล็อกการแก้ไขต่อ (เหมือน pattern อื่นของ editor นี้)
      }
    };
    input.click();
  };

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap items-center gap-1 rounded-xl border border-lane bg-lane/30 p-1.5">
        <ToolbarButton
          label="ตัวหนา"
          active={editor.isActive("bold")}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="ตัวเอียง"
          active={editor.isActive("italic")}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="หัวข้อ"
          active={editor.isActive("heading", { level: 2 })}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="รายการ"
          active={editor.isActive("bulletList")}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="รายการลำดับเลข"
          active={editor.isActive("orderedList")}
          disabled={sourceMode}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="แทรกรูป" disabled={sourceMode} onClick={handleImagePick}>
          <ImagePlus className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="แทรกวิดีโอ YouTube" disabled={sourceMode} onClick={handleYoutubeEmbed}>
          <Clapperboard className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton label="อัปโหลดวิดีโอ" disabled={sourceMode} onClick={handleVideoUpload}>
          <FileVideo className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-lane" />
        <ToolbarButton
          label="ย้อนกลับ"
          disabled={sourceMode || !editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo2 className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          label="ทำซ้ำ"
          disabled={sourceMode || !editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo2 className="h-4 w-4" />
        </ToolbarButton>
        <div className="mx-1 h-5 w-px bg-lane" />
        <ToolbarButton label="แก้ไข HTML source" active={sourceMode} onClick={toggleSourceMode}>
          <Code2 className="h-4 w-4" />
        </ToolbarButton>
      </div>
      {sourceMode ? (
        <textarea
          value={sourceDraft}
          onChange={(e) => setSourceDraft(e.target.value)}
          spellCheck={false}
          className="min-h-[160px] w-full rounded-xl border border-lane bg-white px-3 py-2.5 font-mono text-sm focus:outline-none focus:border-primary"
        />
      ) : (
        <EditorContent editor={editor} />
      )}
      <input type="hidden" name={name} value={sourceMode ? sourceDraft : html} readOnly />
    </div>
  );
}
