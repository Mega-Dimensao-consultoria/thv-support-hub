import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { STATUS_ATENDENTE, STATUS_LABEL, type ChamadoStatus } from "@/lib/status";
import { RichEditor } from "@/components/rich-editor";
import { toast } from "sonner";
import { Download, CheckCircle2, X, Send, Loader2, Star, Paperclip, FileText, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";
import { displayName } from "@/lib/display-name";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { downloadChamadoPdf } from "@/lib/pdf";
import DOMPurify from "isomorphic-dompurify";

export const Route = createFileRoute("/_authenticated/chamados/$id")({
  component: ChamadoDetail,
});

function ChamadoDetail() {
  const { id } = Route.useParams();
  const { user, hasRole, perfil } = useAuth();
  const qc = useQueryClient();
  const [novaMsg, setNovaMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [showAvaliacao, setShowAvaliacao] = useState(false);
  const [showAtribuir, setShowAtribuir] = useState(false);
  const [uploading, setUploading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: chamado, isLoading } = useQuery({
    queryKey: ["chamado", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chamados").select(`
        id, protocolo, status, data_criacao, data_atualizacao, mensagem_inicial,
        solicitante_id, atendente_id, departamento_id,
        solicitante:perfis_usuarios!chamados_solicitante_id_fkey(id, nome, email, nome_historico, removido),
        atendente:perfis_usuarios!chamados_atendente_id_fkey(id, nome, email, nome_historico, removido),
        empresas(nome), departamentos(nome, gestor_id), topicos_suporte(titulo)
      `).eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: respostas } = useQuery({
    queryKey: ["respostas", id],
    queryFn: async () => {
      const { data } = await supabase.from("respostas_triagem").select("*").eq("chamado_id", id);
      return data ?? [];
    },
  });

  const { data: mensagens } = useQuery({
    queryKey: ["mensagens", id],
    queryFn: async () => {
      const { data } = await supabase.from("mensagens_chamado")
        .select("id, mensagem, data_envio, usuario_id, anexo_url, perfis_usuarios(nome, nome_historico, removido)")
        .eq("chamado_id", id).order("data_envio");
      return data ?? [];
    },
  });

  const { data: avaliacao } = useQuery({
    queryKey: ["avaliacao", id],
    queryFn: async () => {
      const { data } = await supabase.from("avaliacoes").select("*").eq("chamado_id", id).maybeSingle();
      return data;
    },
  });

  // Realtime
  useEffect(() => {
    const ch = supabase.channel(`chamado-${id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "mensagens_chamado", filter: `chamado_id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["mensagens", id] }))
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chamados", filter: `id=eq.${id}` },
        () => qc.invalidateQueries({ queryKey: ["chamado", id] }))
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id, qc]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [mensagens]);

  // Trigger avaliação if status concluido and current user is solicitante and no avaliacao yet
  useEffect(() => {
    if (chamado?.status === "concluido" && chamado.solicitante_id === user?.id && !avaliacao && avaliacao !== undefined) {
      setShowAvaliacao(true);
    }
  }, [chamado, avaliacao, user]);

  if (isLoading || !chamado) {
    return <div className="container max-w-5xl mx-auto p-4 md:p-8"><Skeleton className="h-96" /></div>;
  }

  const isSolicitante = chamado.solicitante_id === user?.id;
  const isAtendente = chamado.atendente_id === user?.id;
  const isGestorDept = hasRole("gestor");
  const canChat = isSolicitante || isAtendente || isGestorDept;
  const canApprove = isGestorDept && chamado.status === "aguardando_aprovacao";
  const canChangeStatus = (isAtendente || isGestorDept) && chamado.status !== "aguardando_aprovacao" && chamado.status !== "reprovado";

  const sendMessage = async (anexoUrl?: string) => {
    if ((!novaMsg || novaMsg === "<p></p>") && !anexoUrl) return;
    if (!user) return;
    setSending(true);
    const { error } = await supabase.from("mensagens_chamado").insert({
      chamado_id: id, usuario_id: user.id, mensagem: novaMsg || "", anexo_url: anexoUrl,
    });
    setSending(true);
    if (error) {
      setSending(false);
      return toast.error(error.message);
    }
    setSending(false);
    setNovaMsg("");
    qc.invalidateQueries({ queryKey: ["mensagens", id] });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.error("Arquivo muito grande (máx 5MB)");
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const filePath = `${id}/${crypto.randomUUID()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("chamados-anexos")
      .upload(filePath, file);

    if (uploadError) {
      setUploading(false);
      return toast.error("Erro no upload: " + uploadError.message);
    }

    const { data: { publicUrl } } = supabase.storage
      .from("chamados-anexos")
      .getPublicUrl(filePath);

    await sendMessage(publicUrl);
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const changeStatus = async (status: ChamadoStatus) => {
    const { error } = await supabase.from("chamados").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Status alterado para ${STATUS_LABEL[status]}`);
    qc.invalidateQueries({ queryKey: ["chamado", id] });
  };

  const reprovar = async () => {
    const { error } = await supabase.from("chamados").update({
      status: "reprovado", gestor_aprovador_id: user!.id,
    }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Chamado reprovado");
    qc.invalidateQueries({ queryKey: ["chamado", id] });
  };

  const exportarPdf = () => {
    downloadChamadoPdf({
      chamado, respostas: respostas ?? [], mensagens: mensagens ?? [],
    });
  };

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-sm font-medium text-primary">{chamado.protocolo}</span>
            <StatusBadge status={chamado.status} />
          </div>
          <h1 className="mt-2 text-2xl font-bold">{chamado.topicos_suporte?.titulo}</h1>
          <p className="text-sm text-muted-foreground">
            {chamado.departamentos?.nome} • Aberto por {displayName(chamado.solicitante)} • {chamado.empresas?.nome}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {format(new Date(chamado.data_criacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={exportarPdf}><Download className="mr-2 h-4 w-4" />PDF</Button>
          {isSolicitante && chamado.status !== "concluido" && chamado.status !== "reprovado" && (
            <Button variant="outline" size="sm" onClick={() => changeStatus("concluido")}>
              <CheckCircle2 className="mr-2 h-4 w-4" />Marcar resolvido
            </Button>
          )}
        </div>
      </div>

      {canApprove && (
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-6">
            <div>
              <div className="font-medium">Aprovação pendente</div>
              <div className="text-sm text-muted-foreground">Avalie e aprove ou reprove este chamado.</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={reprovar}><X className="mr-2 h-4 w-4" />Reprovar</Button>
              <Button onClick={() => setShowAtribuir(true)}><CheckCircle2 className="mr-2 h-4 w-4" />Aprovar e atribuir</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {canChangeStatus && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Alterar status:</span>
              <Select value={chamado.status} onValueChange={(v) => changeStatus(v as ChamadoStatus)}>
                <SelectTrigger className="w-72"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_ATENDENTE.map((s) => <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Histórico</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                {mensagens?.map((m) => {
                  const mine = m.usuario_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                        <div className="text-[11px] opacity-70 mb-1">{displayName(m.perfis_usuarios)} • {format(new Date(m.data_envio), "dd/MM HH:mm")}</div>
                        {m.mensagem && <div className="prose-msg text-sm" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(m.mensagem) }} />}
                        {m.anexo_url && (
                          <div className={`mt-2 p-2 rounded-lg border flex items-center gap-2 ${mine ? "bg-white/10 border-white/20" : "bg-background/50 border-border"}`}>
                            {m.anexo_url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <a href={m.anexo_url} target="_blank" rel="noopener noreferrer">
                                <img src={m.anexo_url} alt="Anexo" className="max-w-[200px] rounded border" />
                              </a>
                            ) : (
                              <a href={m.anexo_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs font-medium underline">
                                <FileText className="h-4 w-4" /> Ver arquivo anexo
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={chatEndRef} />
              </div>

              {canChat && (
                <div className="mt-4 space-y-2">
                  <RichEditor value={novaMsg} onChange={setNovaMsg} placeholder="Escreva uma mensagem..." minHeight={80} />
                  <div className="flex justify-between items-center">
                    <div>
                      <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                      <Button variant="ghost" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                        {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4 mr-1" />}
                        Anexar
                      </Button>
                    </div>
                    <Button onClick={() => sendMessage()} disabled={sending || uploading || (!novaMsg || novaMsg === "<p></p>")}>
                      {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {respostas && respostas.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Triagem</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {respostas.map((r) => (
                  <div key={r.id}>
                    <div className="font-medium text-foreground">{r.pergunta_texto}</div>
                    <div className="text-muted-foreground">{r.resposta_texto || "—"}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Detalhes</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <Info label="Atendente" value={chamado.atendente ? displayName(chamado.atendente) : "—"} />
              <Info label="Empresa" value={chamado.empresas?.nome ?? "—"} />
              <Info label="Departamento" value={chamado.departamentos?.nome ?? "—"} />
              <Info label="Atualizado" value={format(new Date(chamado.data_atualizacao), "dd/MM/yyyy HH:mm")} />
            </CardContent>
          </Card>

          {avaliacao && (
            <Card>
              <CardHeader><CardTitle className="text-base">Avaliação</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} className={`h-5 w-5 ${n <= avaliacao.nota ? "fill-warning text-warning" : "text-muted"}`} />
                  ))}
                </div>
                {avaliacao.feedback_texto && <p className="text-muted-foreground">{avaliacao.feedback_texto}</p>}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {showAtribuir && (
        <AtribuirDialog
          chamadoId={id}
          departamentoId={chamado.departamento_id}
          currentUserId={user!.id}
          onClose={() => setShowAtribuir(false)}
          onDone={() => { setShowAtribuir(false); qc.invalidateQueries({ queryKey: ["chamado", id] }); }}
        />
      )}

      {showAvaliacao && (
        <AvaliacaoDialog chamadoId={id} onClose={() => setShowAvaliacao(false)}
          onDone={() => { setShowAvaliacao(false); qc.invalidateQueries({ queryKey: ["avaliacao", id] }); }} />
      )}
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function AtribuirDialog({ chamadoId, departamentoId, currentUserId, onClose, onDone }: {
  chamadoId: string; departamentoId: string; currentUserId: string; onClose: () => void; onDone: () => void;
}) {
  const [modo, setModo] = useState<"eu" | "auto" | "manual">("eu");
  const [atendenteId, setAtendenteId] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: atendentes } = useQuery({
    queryKey: ["atendentes-list"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").in("role", ["atendente", "gestor"]);
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      const { data } = await supabase.from("perfis_usuarios").select("id, nome").in("id", ids);
      return data ?? [];
    },
  });

  const aprovar = async () => {
    setSaving(true);
    let assignedId = currentUserId;
    if (modo === "manual") assignedId = atendenteId;
    if (modo === "auto" && atendentes && atendentes.length > 0) {
      // round-robin: pega o atendente com menos chamados ativos
      const { data: counts } = await supabase.from("chamados").select("atendente_id")
        .in("status", ["atribuido", "aguardando_tratativa", "aguardando_tratativa_externa", "aguardando_solicitante"])
        .in("atendente_id", atendentes.map((a) => a.id));
      const cnt = new Map<string, number>();
      atendentes.forEach((a) => cnt.set(a.id, 0));
      counts?.forEach((c) => c.atendente_id && cnt.set(c.atendente_id, (cnt.get(c.atendente_id) ?? 0) + 1));
      assignedId = [...cnt.entries()].sort((a, b) => a[1] - b[1])[0][0];
    }
    if (!assignedId) {
      setSaving(false);
      return toast.error("Selecione um atendente");
    }
    const { error } = await supabase.from("chamados").update({
      status: "atribuido", atendente_id: assignedId, gestor_aprovador_id: currentUserId,
    }).eq("id", chamadoId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Chamado aprovado e atribuído");
    onDone();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Aprovar e atribuir</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Select value={modo} onValueChange={(v) => setModo(v as "eu" | "auto" | "manual")}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="eu">Atribuir a mim</SelectItem>
              <SelectItem value="auto">Atribuição automática (menor carga)</SelectItem>
              <SelectItem value="manual">Escolher atendente</SelectItem>
            </SelectContent>
          </Select>
          {modo === "manual" && (
            <Select value={atendenteId} onValueChange={setAtendenteId}>
              <SelectTrigger><SelectValue placeholder="Selecione o atendente" /></SelectTrigger>
              <SelectContent>
                {atendentes?.map((a) => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={aprovar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AvaliacaoDialog({ chamadoId, onClose, onDone }: { chamadoId: string; onClose: () => void; onDone: () => void }) {
  const [nota, setNota] = useState(5);
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  const salvar = async () => {
    setSaving(true);
    const { error } = await supabase.from("avaliacoes").insert({
      chamado_id: chamadoId, nota, feedback_texto: feedback,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Avaliação registrada. Obrigado!");
    onDone();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>Avalie o atendimento</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setNota(n)} type="button">
                <Star className={`h-8 w-8 ${n <= nota ? "fill-warning text-warning" : "text-muted"}`} />
              </button>
            ))}
          </div>
          <Textarea placeholder="Deixe um comentário (opcional)" value={feedback} onChange={(e) => setFeedback(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Depois</Button>
          <Button onClick={salvar} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}