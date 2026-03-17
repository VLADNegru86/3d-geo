import { useState, useRef, useEffect, type ElementType } from "react";
import { useSiteContent } from "@/contexts/SiteContentContext";
import { useAuth } from "@/contexts/AuthContext";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface EditableTextProps {
  contentKey: string;
  fallback: string;
  className?: string;
  as?: ElementType;
  multiline?: boolean;
}

export function EditableText({ contentKey, fallback, className, as: Tag = "span", multiline = false }: EditableTextProps) {
  const { getContent, updateContent, editMode } = useSiteContent();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  const value = getContent(contentKey, fallback);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const startEdit = () => {
    setDraft(value);
    setEditing(true);
  };

  const save = async () => {
    if (!draft.trim()) return;
    setSaving(true);
    await updateContent(contentKey, draft);
    setSaving(false);
    setEditing(false);
  };

  const cancel = () => setEditing(false);

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !multiline) { e.preventDefault(); save(); }
    if (e.key === "Escape") cancel();
  };

  if (!isAdmin || !editMode) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (editing) {
    return (
      <span className="inline-flex items-start gap-1 group">
        {multiline ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            className={cn("bg-primary/10 border border-primary/40 rounded-lg px-2 py-1 text-foreground outline-none resize-none min-w-[120px]", className)}
            rows={3}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={handleKey}
            className={cn("bg-primary/10 border border-primary/40 rounded-lg px-2 py-0.5 text-foreground outline-none min-w-[80px]", className)}
          />
        )}
        <button onClick={save} disabled={saving} className="mt-0.5 w-5 h-5 rounded bg-green-500/20 text-green-400 flex items-center justify-center hover:bg-green-500/30 flex-shrink-0">
          <Check className="w-3 h-3" />
        </button>
        <button onClick={cancel} className="mt-0.5 w-5 h-5 rounded bg-red-500/10 text-red-400 flex items-center justify-center hover:bg-red-500/20 flex-shrink-0">
          <X className="w-3 h-3" />
        </button>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 group cursor-pointer" onClick={startEdit}>
      <Tag className={className}>{value}</Tag>
      <span className="opacity-0 group-hover:opacity-100 w-4 h-4 rounded bg-primary/20 text-primary flex items-center justify-center transition-opacity flex-shrink-0">
        <Pencil className="w-2.5 h-2.5" />
      </span>
    </span>
  );
}
