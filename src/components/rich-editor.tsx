import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Italic, List, ListOrdered, Heading2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
}

export function RichEditor({ value, onChange, placeholder, minHeight = 140 }: Props) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    editorProps: {
      attributes: {
        class: "prose-msg w-full px-3 py-2 text-sm focus:outline-none",
        "data-placeholder": placeholder ?? "Escreva aqui...",
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });

  useEffect(() => {
    if (editor && value === "" && editor.getHTML() !== "<p></p>") {
      editor.commands.clearContent();
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className="rounded-md border border-input bg-background">
      <div className="flex items-center gap-1 border-b px-2 py-1">
        <Button type="button" size="sm" variant={editor.isActive("bold") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBold().run()}><Bold className="h-3.5 w-3.5" /></Button>
        <Button type="button" size="sm" variant={editor.isActive("italic") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleItalic().run()}><Italic className="h-3.5 w-3.5" /></Button>
        <Button type="button" size="sm" variant={editor.isActive("heading", { level: 2 }) ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 className="h-3.5 w-3.5" /></Button>
        <Button type="button" size="sm" variant={editor.isActive("bulletList") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleBulletList().run()}><List className="h-3.5 w-3.5" /></Button>
        <Button type="button" size="sm" variant={editor.isActive("orderedList") ? "secondary" : "ghost"}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}><ListOrdered className="h-3.5 w-3.5" /></Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}