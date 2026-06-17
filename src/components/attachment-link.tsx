import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FileText } from "lucide-react";

export function AttachmentLink({ value, mine }: { value: string; mine?: boolean }) {
  const [url, setUrl] = useState<string | null>(null);

  // Compatibilidade: valores antigos podem ser URLs públicas; novos são apenas o path no bucket
  const isUrl = /^https?:\/\//i.test(value);

  useEffect(() => {
    if (isUrl) {
      setUrl(value);
      return;
    }
    let active = true;
    supabase.storage
      .from("chamados-anexos")
      .createSignedUrl(value, 60 * 60)
      .then(({ data }) => {
        if (active && data?.signedUrl) setUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [value, isUrl]);

  if (!url) return <span className="text-xs opacity-60">Carregando anexo…</span>;

  const isImage = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i.test(value);

  return (
    <div
      className={`mt-2 p-2 rounded-lg border flex items-center gap-2 ${
        mine ? "bg-white/10 border-white/20" : "bg-background/50 border-border"
      }`}
    >
      {isImage ? (
        <a href={url} target="_blank" rel="noopener noreferrer">
          <img src={url} alt="Anexo" className="max-w-[200px] rounded border" />
        </a>
      ) : (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs font-medium underline"
        >
          <FileText className="h-4 w-4" /> Ver arquivo anexo
        </a>
      )}
    </div>
  );
}