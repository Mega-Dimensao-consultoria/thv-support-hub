import * as React from 'react'
import { Button, Link, Section, Text } from '@react-email/components'
import { Shell, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  protocolo?: string
  destinatarioNome?: string
  statusAnterior?: string
  statusNovo?: string
  appUrl?: string
  chamadoId?: string
}

const statusLabel = (s?: string) => {
  switch (s) {
    case 'aberto': return 'Aberto'
    case 'em_atendimento': return 'Em atendimento'
    case 'aguardando_solicitante': return 'Aguardando você'
    case 'aguardando_aprovacao': return 'Aguardando aprovação'
    case 'concluido': return 'Concluído'
    case 'reprovado': return 'Reprovado'
    case 'sem_resolucao': return 'Sem resolução'
    default: return s ?? '—'
  }
}

const Email = ({
  protocolo = 'THV-0000',
  destinatarioNome = '',
  statusAnterior = '',
  statusNovo = '',
  appUrl = 'https://chamados.grupothv.com.br',
  chamadoId = '',
}: Props) => {
  const url = `${appUrl}/chamados/${chamadoId}`
  return (
    <Shell
      preview={`Chamado ${protocolo}: ${statusLabel(statusNovo)}`}
      title={`Status atualizado: ${protocolo}`}
    >
      {destinatarioNome && <Text style={styles.paragraph}>Olá, {destinatarioNome}.</Text>}
      <Text style={styles.paragraph}>O status do seu chamado mudou.</Text>
      <Section style={styles.meta}>
        <Text style={{ margin: '0 0 6px 0' }}><strong>Protocolo:</strong> {protocolo}</Text>
        {statusAnterior && (
          <Text style={{ margin: '0 0 6px 0' }}><strong>De:</strong> {statusLabel(statusAnterior)}</Text>
        )}
        <Text style={{ margin: '0' }}><strong>Para:</strong> {statusLabel(statusNovo)}</Text>
      </Section>
      <Button href={url} style={styles.cta}>Ver chamado</Button>
      <Text style={{ ...styles.paragraph, fontSize: '13px', marginTop: '12px' }}>
        Ou acesse: <Link href={url}>{url}</Link>
      </Text>
    </Shell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `[Chamado ${d?.protocolo ?? ''}] Status: ${statusLabel(d?.statusNovo)}`,
  displayName: 'Chamado · Mudança de status',
  previewData: {
    protocolo: 'THV-2026-0042',
    destinatarioNome: 'Maria',
    statusAnterior: 'aberto',
    statusNovo: 'em_atendimento',
    chamadoId: 'demo-id',
  },
} satisfies TemplateEntry