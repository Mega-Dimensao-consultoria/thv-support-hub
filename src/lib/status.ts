import type { Database } from "@/integrations/supabase/types";

export type ChamadoStatus = Database["public"]["Enums"]["chamado_status"];

export const STATUS_LABEL: Record<ChamadoStatus, string> = {
  aguardando_aprovacao: "Aguardando aprovação",
  atribuido: "Atribuído",
  concluido: "Concluído",
  aguardando_tratativa: "Aguardando tratativa",
  aguardando_tratativa_externa: "Aguardando tratativa externa",
  aguardando_solicitante: "Aguardando solicitante",
  reprovado: "Reprovado",
  sem_resolucao: "Sem resolução",
};

export const STATUS_COLOR: Record<ChamadoStatus, string> = {
  aguardando_aprovacao: "bg-warning/15 text-warning border-warning/30",
  atribuido: "bg-primary/10 text-primary border-primary/30",
  concluido: "bg-success/15 text-success border-success/30",
  aguardando_tratativa: "bg-accent/15 text-accent border-accent/30",
  aguardando_tratativa_externa: "bg-accent/15 text-accent border-accent/30",
  aguardando_solicitante: "bg-warning/15 text-warning border-warning/30",
  reprovado: "bg-destructive/15 text-destructive border-destructive/30",
  sem_resolucao: "bg-muted text-muted-foreground border-border",
};

export const STATUS_ATENDENTE: ChamadoStatus[] = [
  "concluido",
  "aguardando_tratativa",
  "aguardando_tratativa_externa",
  "aguardando_solicitante",
  "reprovado",
  "sem_resolucao",
];