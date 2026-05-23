import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ShieldCheck } from "lucide-react";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/aprovacoes")({
  component: Aprovacoes,
});

function Aprovacoes() {
  const { data, isLoading } = useQuery({
    queryKey: ["aprovacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("chamados")
        .select("id, protocolo, status, data_criacao, departamentos(nome), topicos_suporte(titulo), solicitante:perfis_usuarios!chamados_solicitante_id_fkey(nome), empresas(nome)")
        .eq("status", "aguardando_aprovacao")
        .order("data_criacao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-1">Aprovações pendentes</h1>
      <p className="text-sm text-muted-foreground mb-6">Chamados aguardando análise do gestor</p>
      {isLoading ? <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20" />)}</div>
      : !data || data.length === 0 ? (
        <Card className="p-12 text-center">
          <ShieldCheck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum chamado aguardando aprovação.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <Link key={c.id} to="/chamados/$id" params={{ id: c.id }}>
              <Card className="p-4 hover:shadow-[var(--shadow-soft)] transition cursor-pointer">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-primary">{c.protocolo}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <h3 className="mt-1 font-medium truncate">{c.topicos_suporte?.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{c.solicitante?.nome} • {c.empresas?.nome} • {c.departamentos?.nome}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{format(new Date(c.data_criacao), "dd/MM HH:mm")}</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}