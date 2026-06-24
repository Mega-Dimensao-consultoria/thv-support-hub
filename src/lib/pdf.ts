import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { STATUS_LABEL, type ChamadoStatus } from "./status";
import DOMPurify from "isomorphic-dompurify";

function esc(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

interface ChamadoPdfInput {
  chamado: {
    protocolo: string | null;
    status: ChamadoStatus;
    data_criacao: string;
    data_atualizacao: string;
    solicitante: { nome: string; email: string } | null;
    atendente: { nome: string } | null;
    empresas: { nome: string } | null;
    departamentos: { nome: string } | null;
    topicos_suporte: { titulo: string } | null;
  };
  respostas: Array<{ pergunta_texto: string; resposta_texto: string | null }>;
  mensagens: Array<{ id: string; mensagem: string; data_envio: string; perfis_usuarios: { nome: string } | null }>;
}

export async function downloadChamadoPdf({ chamado, respostas, mensagens }: ChamadoPdfInput) {
  const html = `
    <div style="font-family: Inter, sans-serif; padding: 32px; width: 800px; color: #1a1a1a;">
      <div style="border-bottom: 2px solid #1d6da3; padding-bottom: 16px; margin-bottom: 24px;">
        <div style="font-size: 12px; color: #666; letter-spacing: 2px;">GRUPO THV — CENTRAL DE CHAMADOS</div>
        <h1 style="margin: 8px 0 4px; font-size: 22px;">Protocolo ${esc(chamado.protocolo)}</h1>
        <div style="font-size: 14px; color: #555;">${esc(chamado.topicos_suporte?.titulo)}</div>
      </div>

      <table style="width: 100%; font-size: 12px; margin-bottom: 24px;">
        <tr><td style="padding: 4px 0; color: #666; width: 35%;">Solicitante</td><td style="padding: 4px 0;">${esc(chamado.solicitante?.nome ?? "—")} (${esc(chamado.solicitante?.email)})</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Empresa</td><td style="padding: 4px 0;">${esc(chamado.empresas?.nome ?? "—")}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Departamento</td><td style="padding: 4px 0;">${esc(chamado.departamentos?.nome ?? "—")}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Atendente</td><td style="padding: 4px 0;">${esc(chamado.atendente?.nome ?? "—")}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Status</td><td style="padding: 4px 0;">${esc(STATUS_LABEL[chamado.status])}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Criado em</td><td style="padding: 4px 0;">${format(new Date(chamado.data_criacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td></tr>
        <tr><td style="padding: 4px 0; color: #666;">Atualizado em</td><td style="padding: 4px 0;">${format(new Date(chamado.data_atualizacao), "dd/MM/yyyy HH:mm", { locale: ptBR })}</td></tr>
      </table>

      ${respostas.length > 0 ? `
        <h2 style="font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px;">Triagem</h2>
        ${respostas.map((r) => `
          <div style="margin-bottom: 10px; font-size: 12px;">
            <div style="font-weight: 600;">${esc(r.pergunta_texto)}</div>
            <div style="color: #444;">${esc(r.resposta_texto ?? "—")}</div>
          </div>
        `).join("")}
      ` : ""}

      <h2 style="font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin: 20px 0 8px;">Histórico de mensagens</h2>
      ${mensagens.map((m) => `
        <div style="margin-bottom: 14px; font-size: 12px;">
          <div style="color: #666; font-size: 11px;">${esc(m.perfis_usuarios?.nome ?? "Usuário")} — ${format(new Date(m.data_envio), "dd/MM/yyyy HH:mm", { locale: ptBR })}</div>
          <div style="background: #f5f7fa; border-radius: 6px; padding: 8px 12px; margin-top: 4px;">${DOMPurify.sanitize(m.mensagem)}</div>
        </div>
      `).join("")}

      <div style="margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; font-size: 10px; color: #999; text-align: center;">
        Documento gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")} • Grupo THV
      </div>
    </div>
  `;

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container.firstElementChild as HTMLElement, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(`${chamado.protocolo ?? "chamado"}.pdf`);
  } finally {
    document.body.removeChild(container);
  }
}