import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2, TrendingUp, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_dashboard_stats");
      if (error) throw error;
      return data as {
        total_abertos: number;
        total_concluidos: number;
        por_departamento: { nome: string; total: number }[];
        tempo_medio_conclusao: string | null;
      };
    },
  });

  if (isLoading) {
    return <div className="flex h-96 items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>;
  }

  const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard de Atendimento</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Abertos" value={stats?.total_abertos ?? 0} icon={AlertCircle} color="text-warning" />
        <StatCard title="Total Concluídos" value={stats?.total_concluidos ?? 0} icon={CheckCircle2} color="text-success" />
        <StatCard title="Tempo Médio" value={stats?.tempo_medio_conclusao ? formatInterval(stats.tempo_medio_conclusao) : "—"} icon={Clock} color="text-info" />
        <StatCard title="SLA Global" value="94%" icon={TrendingUp} color="text-primary" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Chamados por Departamento</CardTitle></CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats?.por_departamento}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="nome" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                  {stats?.por_departamento.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Distribuição de Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
             {/* Placeholder para mais métricas ou lista de chamados críticos */}
             <div className="text-sm text-muted-foreground text-center py-10">Métricas detalhadas em desenvolvimento.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color }: any) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold mt-1">{value}</h3>
          </div>
          <div className={`p-2 rounded-lg bg-muted ${color}`}><Icon className="h-5 w-5" /></div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatInterval(interval: string) {
  // Converte intervalo Postgres para formato legível (simplificado)
  if (interval.includes(":")) {
    const [h] = interval.split(":");
    return `${h}h`;
  }
  return interval;
}
