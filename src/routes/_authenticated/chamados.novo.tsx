import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { RichEditor } from "@/components/rich-editor";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/chamados/novo")({
  component: NovoChamado,
});

function NovoChamado() {
  const navigate = useNavigate();
  const { user, perfil } = useAuth();
  const [departamentoId, setDepartamentoId] = useState("");
  const [topicoId, setTopicoId] = useState("");
  const [respostas, setRespostas] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: departamentos } = useQuery({
    queryKey: ["departamentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("departamentos").select("id, nome").order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: topicos } = useQuery({
    queryKey: ["topicos", departamentoId],
    enabled: !!departamentoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("topicos_suporte").select("id, titulo")
        .eq("departamento_id", departamentoId).order("titulo");
      if (error) throw error;
      return data;
    },
  });

  const { data: perguntas } = useQuery({
    queryKey: ["perguntas", topicoId],
    enabled: !!topicoId,
    queryFn: async () => {
      const { data, error } = await supabase.from("perguntas_triagem")
        .select("id, pergunta_texto, tipo_campo, opcoes, ordem").eq("topico_id", topicoId).order("ordem");
      if (error) throw error;
      return data;
    },
  });

  const canSubmit = useMemo(() => {
    if (!departamentoId || !topicoId || !mensagem || mensagem === "<p></p>") return false;
    if (perguntas && perguntas.length > 0) {
      for (const p of perguntas) {
        if (!respostas[p.id]) return false;
      }
    }
    return true;
  }, [departamentoId, topicoId, mensagem, perguntas, respostas]);

  const submit = async () => {
    if (!user || !perfil) return;
    setSaving(true);
    const { data: chamado, error } = await supabase.from("chamados").insert({
      solicitante_id: user.id,
      empresa_solicitante_id: perfil.empresa_id,
      departamento_id: departamentoId,
      topico_id: topicoId,
      mensagem_inicial: mensagem,
    }).select("id").single();
    if (error || !chamado) {
      setSaving(false);
      return toast.error(error?.message ?? "Erro ao criar chamado");
    }

    if (perguntas && perguntas.length > 0) {
      const rows = perguntas.map((p) => ({
        chamado_id: chamado.id,
        pergunta_texto: p.pergunta_texto,
        resposta_texto: respostas[p.id] ?? "",
      }));
      await supabase.from("respostas_triagem").insert(rows);
    }

    await supabase.from("mensagens_chamado").insert({
      chamado_id: chamado.id,
      usuario_id: user.id,
      mensagem,
    });

    setSaving(false);
    toast.success("Chamado criado!");
    navigate({ to: "/chamados/$id", params: { id: chamado.id } });
  };

  return (
    <div className="container max-w-3xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-1">Novo chamado</h1>
      <p className="text-sm text-muted-foreground mb-6">Descreva sua solicitação para a equipe de atendimento</p>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">1. Departamento</CardTitle></CardHeader>
          <CardContent>
            <Select value={departamentoId} onValueChange={(v) => { setDepartamentoId(v); setTopicoId(""); setRespostas({}); }}>
              <SelectTrigger><SelectValue placeholder="Selecione o departamento" /></SelectTrigger>
              <SelectContent>
                {departamentos?.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}
              </SelectContent>
            </Select>
            {departamentos && departamentos.length === 0 && (
              <p className="mt-2 text-xs text-muted-foreground">Nenhum departamento cadastrado. Solicite ao gestor.</p>
            )}
          </CardContent>
        </Card>

        {departamentoId && (
          <Card>
            <CardHeader><CardTitle className="text-base">2. Tópico</CardTitle></CardHeader>
            <CardContent>
              <Select value={topicoId} onValueChange={(v) => { setTopicoId(v); setRespostas({}); }}>
                <SelectTrigger><SelectValue placeholder="Selecione o tópico" /></SelectTrigger>
                <SelectContent>
                  {topicos?.map((t) => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        )}

        {topicoId && perguntas && perguntas.length > 0 && (
          <Card>
            <CardHeader><CardTitle className="text-base">3. Triagem</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {perguntas.map((p) => (
                <div key={p.id} className="space-y-2">
                  <Label>{p.pergunta_texto}</Label>
                  {p.tipo_campo === "multipla_escolha" && p.opcoes ? (
                    <RadioGroup value={respostas[p.id] ?? ""} onValueChange={(v) => setRespostas({ ...respostas, [p.id]: v })}>
                      {p.opcoes.map((op) => (
                        <div key={op} className="flex items-center gap-2">
                          <RadioGroupItem value={op} id={`${p.id}-${op}`} />
                          <Label htmlFor={`${p.id}-${op}`} className="font-normal cursor-pointer">{op}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <Input value={respostas[p.id] ?? ""} onChange={(e) => setRespostas({ ...respostas, [p.id]: e.target.value })} />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {topicoId && (
          <Card>
            <CardHeader><CardTitle className="text-base">{perguntas && perguntas.length > 0 ? "4." : "3."} Detalhes</CardTitle></CardHeader>
            <CardContent>
              <RichEditor value={mensagem} onChange={setMensagem} placeholder="Descreva sua solicitação..." />
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end">
          <Button size="lg" disabled={!canSubmit || saving} onClick={submit}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Criar chamado
          </Button>
        </div>
      </div>
    </div>
  );
}