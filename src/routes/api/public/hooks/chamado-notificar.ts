import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { createClient } from '@supabase/supabase-js'
import { render } from '@react-email/components'
import { TEMPLATES } from '@/lib/email-templates/registry'
import { timingSafeEqual } from 'node:crypto'

const SENDER_DOMAIN = 'notificacoes.chamados.grupothv.com.br'
const FROM_DOMAIN = 'chamados.grupothv.com.br'
const SITE_NAME = 'THV Connect'
const APP_URL = 'https://chamados.grupothv.com.br'

type EventType = 'novo' | 'atribuido' | 'mensagem' | 'status' | 'concluido'

interface Payload {
  event: EventType
  chamado_id: string
  status_anterior?: string | null
  status_novo?: string | null
  mensagem_autor_id?: string | null
  mensagem_preview?: string | null
  mensagem_id?: string | null
}

function previewFromHtml(html: string | null | undefined, max = 240): string {
  if (!html) return ''
  const text = String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? text.slice(0, max) + '…' : text
}

function redact(email: string) {
  const [u, d] = email.split('@')
  return `${u?.[0] ?? '*'}***@${d ?? '?'}`
}

async function sendPush(userIds: string[], payload: { title: string; body: string; url?: string; tag?: string }) {
  if (!userIds || userIds.length === 0) return
  try {
    const mod = await import('@/lib/push/server.server')
    await mod.sendPushToUsers(userIds, payload)
  } catch (e) {
    console.warn('sendPush failed', e)
  }
}

async function enqueueEmail(
  supabase: any,
  templateName: string,
  recipientEmail: string,
  templateData: Record<string, any>,
  idempotencyKey: string,
) {
  const entry = TEMPLATES[templateName]
  if (!entry) return

  const normalizedEmail = recipientEmail.toLowerCase()

  const { data: suppressed } = await supabase
    .from('suppressed_emails')
    .select('email')
    .eq('email', normalizedEmail)
    .maybeSingle()
  if (suppressed) {
    await supabase.from('email_send_log').insert({
      message_id: idempotencyKey,
      template_name: templateName,
      recipient_email: normalizedEmail,
      status: 'suppressed',
      error_message: 'Recipient is on suppression list',
    })
    return
  }

  const data = { appUrl: APP_URL, ...templateData }
  const element = React.createElement(entry.component as any, data)
  const html = await render(element)
  const plainText = await render(element, { plainText: true })
  const subject =
    typeof entry.subject === 'function' ? entry.subject(data) : entry.subject

  await supabase.from('email_send_log').insert({
    message_id: idempotencyKey,
    template_name: templateName,
    recipient_email: normalizedEmail,
    status: 'pending',
  })

  const { error: enqueueError } = await supabase.rpc('enqueue_email', {
    queue_name: 'transactional_emails',
    payload: {
      message_id: idempotencyKey,
      to: normalizedEmail,
      from: `${SITE_NAME} <no-reply@${FROM_DOMAIN}>`,
      sender_domain: SENDER_DOMAIN,
      subject,
      html,
      text: plainText,
      purpose: 'transactional',
      label: templateName,
      idempotency_key: idempotencyKey,
      unsubscribe_token: null,
      queued_at: new Date().toISOString(),
    },
  })

  if (enqueueError) {
    console.error('enqueue_email failed', {
      error: enqueueError,
      templateName,
      recipient: redact(normalizedEmail),
    })
    await supabase.from('email_send_log').insert({
      message_id: idempotencyKey,
      template_name: templateName,
      recipient_email: normalizedEmail,
      status: 'failed',
      error_message: enqueueError.message ?? 'enqueue failed',
    })
  }
}

export const Route = createFileRoute('/api/public/hooks/chamado-notificar')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabaseUrl =
          process.env.SUPABASE_URL ?? import.meta.env.VITE_SUPABASE_URL
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

        if (!supabaseUrl || !serviceKey) {
          return new Response('Server config error', { status: 500 })
        }

        const providedSecret = request.headers.get('x-webhook-secret') ?? ''

        const supabase: any = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        })

        // Lê o segredo esperado do Vault (única fonte de verdade)
        const { data: secretRow, error: secretErr } = await supabase
          .schema('vault')
          .from('decrypted_secrets')
          .select('decrypted_secret')
          .eq('name', 'chamado_webhook_secret')
          .maybeSingle()

        if (secretErr || !secretRow?.decrypted_secret) {
          console.error('chamado-notificar: falha ao ler segredo do vault', secretErr)
          return new Response('Server config error', { status: 500 })
        }

        const expectedBuf = Buffer.from(String(secretRow.decrypted_secret))
        const providedBuf = Buffer.from(providedSecret)
        const valid =
          providedBuf.length === expectedBuf.length &&
          timingSafeEqual(providedBuf, expectedBuf)

        if (!valid) {
          return new Response('Unauthorized', { status: 401 })
        }

        let body: Payload
        try {
          body = (await request.json()) as Payload
        } catch {
          return new Response('Invalid JSON', { status: 400 })
        }
        if (!body?.event || !body?.chamado_id) {
          return new Response('Missing event/chamado_id', { status: 400 })
        }

        const { data: chamado, error: cErr } = await supabase
          .from('chamados')
          .select(
            'id, protocolo, status, solicitante_id, atendente_id, departamento_id, topico_id, mensagem_inicial, empresa_solicitante_id',
          )
          .eq('id', body.chamado_id)
          .maybeSingle()
        if (cErr || !chamado) {
          return new Response('Chamado not found', { status: 404 })
        }

        const [solicitanteRes, atendenteRes, deptRes, topicoRes, empresaRes] =
          await Promise.all([
            supabase
              .from('perfis_usuarios')
              .select('id, nome, email, bloqueado, removido')
              .eq('id', chamado.solicitante_id)
              .maybeSingle(),
            chamado.atendente_id
              ? supabase
                  .from('perfis_usuarios')
                  .select('id, nome, email, bloqueado, removido')
                  .eq('id', chamado.atendente_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            supabase
              .from('departamentos')
              .select('id, nome')
              .eq('id', chamado.departamento_id)
              .maybeSingle(),
            supabase
              .from('topicos_suporte')
              .select('id, titulo')
              .eq('id', chamado.topico_id)
              .maybeSingle(),
            chamado.empresa_solicitante_id
              ? supabase
                  .from('empresas')
                  .select('id, nome')
                  .eq('id', chamado.empresa_solicitante_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
          ])

        const solicitante = solicitanteRes.data
        const atendente = atendenteRes.data
        const departamento = deptRes.data
        const topico = topicoRes.data
        const empresa = empresaRes.data

        const isActive = (p: any) =>
          p && !p.bloqueado && !p.removido && p.email
        const common = {
          protocolo: chamado.protocolo ?? '',
          chamadoId: chamado.id,
          departamentoNome: departamento?.nome ?? '',
          topicoTitulo: topico?.titulo ?? '',
        }

        if (body.event === 'novo') {
          const { data: gestores } = await supabase
            .from('gestor_departamentos')
            .select('user_id')
            .eq('departamento_id', chamado.departamento_id)
          const userIds = (gestores ?? []).map((g: any) => g.user_id)
          if (userIds.length > 0) {
            const { data: perfis } = await supabase
              .from('perfis_usuarios')
              .select('id, nome, email, bloqueado, removido')
              .in('id', userIds)
            const data = {
              ...common,
              solicitanteNome: solicitante?.nome ?? '',
              empresaNome: empresa?.nome ?? '',
              mensagemPreview: previewFromHtml(chamado.mensagem_inicial),
            }
            await Promise.all(
              (perfis ?? []).filter(isActive).map((p: any) =>
                enqueueEmail(
                  supabase,
                  'chamado-novo',
                  p.email,
                  { ...data, destinatarioNome: p.nome },
                  `chamado-novo:${chamado.id}:${p.id}`,
                ),
              ),
            )
            const ativos = (perfis ?? []).filter(isActive).map((p: any) => p.id)
            await sendPush(ativos, {
              title: `Novo chamado ${chamado.protocolo ?? ''}`.trim(),
              body: `${solicitante?.nome ?? 'Solicitante'}${empresa?.nome ? ` (${empresa.nome})` : ''}: ${previewFromHtml(chamado.mensagem_inicial, 120)}`,
              url: `/chamados/${chamado.id}`,
              tag: `chamado-${chamado.id}`,
            })
          }
        } else if (body.event === 'atribuido') {
          if (isActive(atendente)) {
            await enqueueEmail(
              supabase,
              'chamado-atribuido',
              atendente.email,
              {
                ...common,
                atendenteNome: atendente.nome,
                solicitanteNome: solicitante?.nome ?? '',
              },
              `chamado-atribuido:${chamado.id}:${atendente.id}`,
            )
            await sendPush([atendente.id], {
              title: `Chamado atribuído: ${chamado.protocolo ?? ''}`,
              body: `Você foi designado(a) para atender ${solicitante?.nome ?? 'o solicitante'}.`,
              url: `/chamados/${chamado.id}`,
              tag: `chamado-${chamado.id}`,
            })
          }
        } else if (body.event === 'mensagem') {
          const autorId = body.mensagem_autor_id
          const autorEhSolicitante = autorId === chamado.solicitante_id
          const autorNome = autorEhSolicitante
            ? solicitante?.nome ?? 'Solicitante'
            : atendente?.nome ?? 'Atendente'
          const destinatarios: any[] = []
          if (autorEhSolicitante && isActive(atendente))
            destinatarios.push(atendente)
          if (!autorEhSolicitante && isActive(solicitante))
            destinatarios.push(solicitante)
          const data = {
            ...common,
            autorNome,
            mensagemPreview: previewFromHtml(body.mensagem_preview),
          }
          // Idempotency: use the message ID so retries don't duplicate emails.
          // mensagem_id is required for 'mensagem' events; refuse otherwise.
          if (!body.mensagem_id) {
            return new Response('mensagem_id required for mensagem event', { status: 400 })
          }
          await Promise.all(
            destinatarios.map((p) =>
              enqueueEmail(
                supabase,
                'chamado-mensagem',
                p.email,
                { ...data, destinatarioNome: p.nome },
                `chamado-mensagem:${body.mensagem_id}:${p.id}`,
              ),
            ),
          )
          await sendPush(destinatarios.map((p) => p.id), {
            title: `Nova mensagem · ${chamado.protocolo ?? ''}`,
            body: `${autorNome}: ${previewFromHtml(body.mensagem_preview, 140)}`,
            url: `/chamados/${chamado.id}`,
            tag: `chamado-${chamado.id}-msg`,
          })
        } else if (body.event === 'status') {
          if (isActive(solicitante)) {
            await enqueueEmail(
              supabase,
              'chamado-status',
              solicitante.email,
              {
                ...common,
                destinatarioNome: solicitante.nome,
                statusAnterior: body.status_anterior ?? '',
                statusNovo: body.status_novo ?? chamado.status,
              },
              `chamado-status:${chamado.id}:${body.status_novo ?? chamado.status}`,
            )
            await sendPush([solicitante.id], {
              title: `Status atualizado · ${chamado.protocolo ?? ''}`,
              body: `Seu chamado agora está: ${body.status_novo ?? chamado.status}`,
              url: `/chamados/${chamado.id}`,
              tag: `chamado-${chamado.id}-status`,
            })
          }
        } else if (body.event === 'concluido') {
          if (isActive(solicitante)) {
            await enqueueEmail(
              supabase,
              'chamado-concluido',
              solicitante.email,
              {
                ...common,
                destinatarioNome: solicitante.nome,
                atendenteNome: atendente?.nome ?? '',
              },
              `chamado-concluido:${chamado.id}`,
            )
            await sendPush([solicitante.id], {
              title: `Chamado concluído · ${chamado.protocolo ?? ''}`,
              body: 'Avalie o atendimento tocando aqui.',
              url: `/chamados/${chamado.id}`,
              tag: `chamado-${chamado.id}-done`,
            })
          }
        }

        return Response.json({ ok: true })
      },
    },
  },
})