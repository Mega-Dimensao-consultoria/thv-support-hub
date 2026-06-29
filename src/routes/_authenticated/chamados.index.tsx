import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { PlusCircle, Inbox } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const Route = createFileRoute("/_authenticated/chamados/")({
  component: ChamadosList,
});

function ChamadosList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["meus-chamados", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chamados")
        .select("id, protocolo, status, data_criacao, departamentos(nome), topicos_suporte(titulo)")
        .eq("solicitante_id", user!.id)
        .order("data_criacao", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Meus chamados</h1>
          <p className="text-sm text-muted-foreground mt-1">Acompanhe o andamento das suas solicitações</p>
        </div>
        <Button onClick={() => navigate({ to: "/chamados/novo" })}><PlusCircle className="mr-2 h-4 w-4" />Novo chamado</Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : !data || data.length === 0 ? (
        <Card className="p-12 text-center">
          <Inbox className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Nenhum chamado ainda</h3>
          <p className="text-sm text-muted-foreground mb-4">Crie seu primeiro chamado para começar.</p>
          <Button onClick={() => navigate({ to: "/chamados/novo" })}>Abrir chamado</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => navigate({ to: "/chamados/$id", params: { id: c.id } })}
              className="tappable block w-full text-left"
            >
              <Card className="p-4 hover:shadow-[var(--shadow-soft)]">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-medium text-primary">{c.protocolo}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <h3 className="mt-1 font-medium truncate">{c.topicos_suporte?.titulo}</h3>
                    <p className="text-sm text-muted-foreground">{c.departamentos?.nome}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {format(new Date(c.data_criacao), "dd MMM yyyy 'às' HH:mm", { locale: ptBR })}
                  </div>
                </div>
              </Card>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}