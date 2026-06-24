import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Trash2, Users, ArrowRight, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/admin")({
  component: Admin,
});

function Admin() {
  const { roles } = useAuth();
  const isAdmin = roles.includes("admin");
  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Configurações</h1>
      {isAdmin && (
        <Link to="/usuarios" className="mb-4 flex items-center justify-between rounded-md border bg-card p-4 hover:bg-accent transition">
          <span className="flex items-center gap-2 font-medium"><Users className="h-4 w-4" /> Gestão de usuários, papéis e bloqueios</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
      <Tabs defaultValue="deptos">
        <TabsList>
          <TabsTrigger value="deptos">Departamentos</TabsTrigger>
          <TabsTrigger value="topicos">Tópicos & Triagem</TabsTrigger>
          {isAdmin && <TabsTrigger value="site">Tela inicial</TabsTrigger>}
        </TabsList>
        <TabsContent value="deptos"><Departamentos /></TabsContent>
        <TabsContent value="topicos"><Topicos /></TabsContent>
        {isAdmin && <TabsContent value="site"><SiteSettings /></TabsContent>}
      </Tabs>
    </div>
  );
}

function Departamentos() {
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [gestorId, setGestorId] = useState("");
  const { data } = useQuery({
    queryKey: ["admin-deptos"],
    queryFn: async () => (await supabase.from("departamentos").select("id, nome, gestor:perfis_usuarios(nome)").order("nome")).data ?? [],
  });
  const { data: gestores } = useQuery({
    queryKey: ["admin-gestores"],
    queryFn: async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "gestor");
      const ids = (roles ?? []).map((r) => r.user_id);
      if (ids.length === 0) return [];
      return (await supabase.from("perfis_usuarios").select("id, nome").in("id", ids)).data ?? [];
    },
  });

  const add = async () => {
    if (!nome) return;
    const { data: novoDept, error } = await supabase
      .from("departamentos")
      .insert({ nome })
      .select("id")
      .single();
    if (error) return toast.error(error.message);
    if (gestorId && novoDept) {
      const { error: gdErr } = await supabase
        .from("gestor_departamentos")
        .insert({ user_id: gestorId, departamento_id: novoDept.id });
      if (gdErr) return toast.error(gdErr.message);
    }
    toast.success("Departamento criado");
    setNome(""); setGestorId("");
    qc.invalidateQueries({ queryKey: ["admin-deptos"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("departamentos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["admin-deptos"] });
  };

  return (
    <Card className="mt-4">
      <CardHeader><CardTitle className="text-base">Departamentos</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
          <Input placeholder="Nome do departamento" value={nome} onChange={(e) => setNome(e.target.value)} />
          <Select value={gestorId} onValueChange={setGestorId}>
            <SelectTrigger><SelectValue placeholder="Gestor (opcional)" /></SelectTrigger>
            <SelectContent>{gestores?.map((g) => <SelectItem key={g.id} value={g.id}>{g.nome}</SelectItem>)}</SelectContent>
          </Select>
          <Button onClick={add}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
        </div>
        <div className="space-y-1">
          {data?.map((d) => (
            <div key={d.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
              <div>
                <div className="font-medium">{d.nome}</div>
                <div className="text-xs text-muted-foreground">Gestor: {d.gestor?.nome ?? "—"}</div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => remove(d.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function Topicos() {
  const qc = useQueryClient();
  const [deptoId, setDeptoId] = useState("");
  const [topicoSel, setTopicoSel] = useState("");
  const [novoTopico, setNovoTopico] = useState("");
  const [pergunta, setPergunta] = useState("");
  const [opcoes, setOpcoes] = useState("");
  const [tipo, setTipo] = useState<"texto" | "multipla_escolha">("texto");

  const { data: deptos } = useQuery({
    queryKey: ["admin-deptos-simple"],
    queryFn: async () => (await supabase.from("departamentos").select("id, nome").order("nome")).data ?? [],
  });
  const { data: topicos } = useQuery({
    queryKey: ["admin-topicos", deptoId],
    enabled: !!deptoId,
    queryFn: async () => (await supabase.from("topicos_suporte").select("id, titulo").eq("departamento_id", deptoId).order("titulo")).data ?? [],
  });
  const { data: perguntas } = useQuery({
    queryKey: ["admin-perguntas", topicoSel],
    enabled: !!topicoSel,
    queryFn: async () => (await supabase.from("perguntas_triagem").select("*").eq("topico_id", topicoSel).order("ordem")).data ?? [],
  });

  const addTopico = async () => {
    if (!deptoId || !novoTopico) return;
    const { error } = await supabase.from("topicos_suporte").insert({ departamento_id: deptoId, titulo: novoTopico });
    if (error) return toast.error(error.message);
    setNovoTopico("");
    qc.invalidateQueries({ queryKey: ["admin-topicos", deptoId] });
  };

  const addPergunta = async () => {
    if (!topicoSel || !pergunta) return;
    const { error } = await supabase.from("perguntas_triagem").insert({
      topico_id: topicoSel, pergunta_texto: pergunta, tipo_campo: tipo,
      opcoes: tipo === "multipla_escolha" ? opcoes.split(",").map((o) => o.trim()).filter(Boolean) : [],
      ordem: (perguntas?.length ?? 0),
    });
    if (error) return toast.error(error.message);
    setPergunta(""); setOpcoes("");
    qc.invalidateQueries({ queryKey: ["admin-perguntas", topicoSel] });
  };

  return (
    <div className="mt-4 space-y-4">
      <Card>
        <CardHeader><CardTitle className="text-base">Tópicos</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 md:grid-cols-[1fr_1fr_auto]">
            <Select value={deptoId} onValueChange={(v) => { setDeptoId(v); setTopicoSel(""); }}>
              <SelectTrigger><SelectValue placeholder="Departamento" /></SelectTrigger>
              <SelectContent>{deptos?.map((d) => <SelectItem key={d.id} value={d.id}>{d.nome}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="Novo tópico" value={novoTopico} onChange={(e) => setNovoTopico(e.target.value)} />
            <Button onClick={addTopico} disabled={!deptoId}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
          </div>
          {topicos && topicos.length > 0 && (
            <Select value={topicoSel} onValueChange={setTopicoSel}>
              <SelectTrigger><SelectValue placeholder="Selecionar tópico para editar triagem" /></SelectTrigger>
              <SelectContent>{topicos.map((t) => <SelectItem key={t.id} value={t.id}>{t.titulo}</SelectItem>)}</SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {topicoSel && (
        <Card>
          <CardHeader><CardTitle className="text-base">Perguntas de triagem</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2 rounded-md border p-3">
              <Label>Nova pergunta</Label>
              <Input placeholder="Texto da pergunta" value={pergunta} onChange={(e) => setPergunta(e.target.value)} />
              <div className="grid gap-2 md:grid-cols-[200px_1fr_auto]">
                <Select value={tipo} onValueChange={(v) => setTipo(v as typeof tipo)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto livre</SelectItem>
                    <SelectItem value="multipla_escolha">Múltipla escolha</SelectItem>
                  </SelectContent>
                </Select>
                {tipo === "multipla_escolha" && (
                  <Input placeholder="Opções separadas por vírgula" value={opcoes} onChange={(e) => setOpcoes(e.target.value)} />
                )}
                <Button onClick={addPergunta} disabled={!pergunta}><Plus className="mr-2 h-4 w-4" />Adicionar</Button>
              </div>
            </div>
            <div className="space-y-1">
              {perguntas?.map((p) => (
                <div key={p.id} className="flex items-center justify-between border-b last:border-0 py-2 text-sm">
                  <div>
                    <div className="font-medium">{p.pergunta_texto}</div>
                    <div className="text-xs text-muted-foreground">{p.tipo_campo}{p.opcoes && p.opcoes.length > 0 ? ` • ${p.opcoes.join(", ")}` : ""}</div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={async () => {
                    await supabase.from("perguntas_triagem").delete().eq("id", p.id);
                    qc.invalidateQueries({ queryKey: ["admin-perguntas", topicoSel] });
                  }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

const SITE_FIELDS: { key: string; label: string; multiline?: boolean }[] = [
  { key: "hero_badge", label: "Selo (acima do título)" },
  { key: "hero_title", label: "Título principal", multiline: true },
  { key: "hero_subtitle", label: "Subtítulo", multiline: true },
  { key: "hero_cta", label: "Texto do botão (CTA)" },
  { key: "empresas_title", label: "Título da seção de empresas" },
  { key: "feature_1_title", label: "Recurso 1 — título" },
  { key: "feature_1_desc", label: "Recurso 1 — descrição" },
  { key: "feature_2_title", label: "Recurso 2 — título" },
  { key: "feature_2_desc", label: "Recurso 2 — descrição" },
  { key: "feature_3_title", label: "Recurso 3 — título" },
  { key: "feature_3_desc", label: "Recurso 3 — descrição" },
  { key: "footer_text", label: "Texto do rodapé" },
];

function SiteSettings() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => (await supabase.from("site_settings").select("key, value")).data ?? [],
  });
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const get = (k: string) => values[k] ?? data?.find((d) => d.key === k)?.value ?? "";

  const save = async (key: string) => {
    setSaving(key);
    const { error } = await supabase.from("site_settings").upsert({ key, value: get(key) });
    setSaving(null);
    if (error) return toast.error(error.message);
    toast.success("Salvo");
    qc.invalidateQueries({ queryKey: ["site-settings"] });
    qc.invalidateQueries({ queryKey: ["site-settings-public"] });
  };

  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle className="text-base">Textos da tela inicial</CardTitle>
        <p className="text-xs text-muted-foreground">Edite os textos exibidos na página pública do aplicativo. As alterações aparecem imediatamente para os visitantes.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {SITE_FIELDS.map((f) => (
          <div key={f.key} className="grid gap-2">
            <Label htmlFor={f.key}>{f.label}</Label>
            <div className="flex gap-2">
              {f.multiline ? (
                <Textarea id={f.key} rows={2} value={get(f.key)} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              ) : (
                <Input id={f.key} value={get(f.key)} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))} />
              )}
              <Button size="sm" variant="outline" onClick={() => save(f.key)} disabled={saving === f.key}>
                <Save className="h-4 w-4 mr-1" />Salvar
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}