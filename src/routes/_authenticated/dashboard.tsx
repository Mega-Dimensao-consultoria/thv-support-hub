import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { STATUS_LABEL } from "@/lib/status";
import { Star } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [chamadosRes, avalRes] = await Promise.all([
        supabase.from("chamados").select("status, empresa_solicitante_id, data_criacao, data_atualizacao, atendente_id, empresas(nome)"),
        supabase.from("avaliacoes").select("nota, chamado_id, chamados(atendente_id, atendente:perfis_usuarios!chamados_atendente_id_fkey(nome))"),
      ]);
      return { chamados: chamadosRes.data ?? [], avaliacoes: avalRes.data ?? [] };
    },
  });

  if (isLoading || !data) return <div className="container max-w-6xl mx-auto p-4 md:p-8 grid gap-4 md:grid-cols-4">{[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}</div>;

  const total = data.chamados.length;
  const concluidos = data.chamados.filter((c) => c.status === "concluido");
  const abertos = data.chamados.filter((c) => !["concluido", "reprovado", "sem_resolucao"].includes(c.status)).length;
  const tempoMedio = concluidos.length === 0 ? 0 : concluidos.reduce((acc, c) => acc + (new Date(c.data_atualizacao).getTime() - new Date(c.data_criacao).getTime()), 0) / concluidos.length / (1000 * 60 * 60);
  const notaMedia = data.avaliacoes.length === 0 ? 0 : data.avaliacoes.reduce((a, v) => a + v.nota, 0) / data.avaliacoes.length;

  const porEmpresa = Object.entries(data.chamados.reduce<Record<string, number>>((acc, c) => {
    const nome = c.empresas?.nome ?? "Sem empresa";
    acc[nome] = (acc[nome] ?? 0) + 1;
    return acc;
  }, {})).map(([nome, total]) => ({ nome, total }));

  const porStatus = Object.entries(data.chamados.reduce<Record<string, number>>((acc, c) => {
    acc[c.status] = (acc[c.status] ?? 0) + 1;
    return acc;
  }, {})).map(([status, total]) => ({ status: STATUS_LABEL[status as keyof typeof STATUS_LABEL], total }));

  // Ranking atendentes
  const ranking = new Map<string, { nome: string; soma: number; n: number }>();
  data.avaliacoes.forEach((a) => {
    const nome = a.chamados?.atendente?.nome;
    if (!nome) return;
    const cur = ranking.get(nome) ?? { nome, soma: 0, n: 0 };
    cur.soma += a.nota; cur.n += 1;
    ranking.set(nome, cur);
  });
  const rankingArr = [...ranking.values()].map((r) => ({ ...r, media: r.soma / r.n })).sort((a, b) => b.media - a.media);

  return (
    <div className="container max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral dos atendimentos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Stat label="Total de chamados" value={total} />
        <Stat label="Em aberto" value={abertos} />
        <Stat label="Tempo médio (h)" value={tempoMedio.toFixed(1)} />
        <Stat label="Nota média" value={notaMedia.toFixed(2)} icon={<Star className="h-4 w-4 fill-warning text-warning" />} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Chamados por empresa</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porEmpresa}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="nome" fontSize={11} />
                <YAxis fontSize={11} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="total" fill="oklch(0.48 0.13 220)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Por status</CardTitle></CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={porStatus} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis type="number" fontSize={11} allowDecimals={false} />
                <YAxis type="category" dataKey="status" fontSize={10} width={140} />
                <Tooltip />
                <Bar dataKey="total" fill="oklch(0.62 0.16 165)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Ranking de atendentes</CardTitle></CardHeader>
        <CardContent>
          {rankingArr.length === 0 ? <p className="text-sm text-muted-foreground">Sem avaliações ainda.</p>
          : <div className="space-y-2">{rankingArr.map((r) => (
              <div key={r.nome} className="flex items-center justify-between border-b last:border-0 py-2">
                <span className="font-medium text-sm">{r.nome}</span>
                <div className="flex items-center gap-2 text-sm">
                  <Star className="h-4 w-4 fill-warning text-warning" />
                  <span className="font-semibold">{r.media.toFixed(2)}</span>
                  <span className="text-muted-foreground">({r.n})</span>
                </div>
              </div>
            ))}</div>}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: string | number; icon?: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 text-3xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}