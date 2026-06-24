import * as React from 'react'
import { Button, Link, Section, Text } from '@react-email/components'
import { Shell, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  protocolo?: string
  destinatarioNome?: string
  autorNome?: string
  mensagemPreview?: string
  appUrl?: string
  chamadoId?: string
}

const Email = ({
  protocolo = 'THV-0000',
  destinatarioNome = '',
  autorNome = 'Equipe',
  mensagemPreview = '',
  appUrl = 'https://chamados.grupothv.com.br',
  chamadoId = '',
}: Props) => {
  const url = `${appUrl}/chamados/${chamadoId}`
  return (
    <Shell
      preview={`Nova mensagem no chamado ${protocolo}`}
      title={`Nova mensagem: ${protocolo}`}
    >
      {destinatarioNome && <Text style={styles.paragraph}>Olá, {destinatarioNome}.</Text>}
      <Text style={styles.paragraph}>
        <strong>{autorNome}</strong> enviou uma nova mensagem neste chamado:
      </Text>
      {mensagemPreview && (
        <Section style={styles.meta}>
          <Text style={{ margin: 0, whiteSpace: 'pre-wrap' as const }}>{mensagemPreview}</Text>
        </Section>
      )}
      <Button href={url} style={styles.cta}>Responder no sistema</Button>
      <Text style={{ ...styles.paragraph, fontSize: '13px', marginTop: '12px' }}>
        Ou acesse: <Link href={url}>{url}</Link>
      </Text>
    </Shell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `[Chamado ${d?.protocolo ?? ''}] Nova mensagem de ${d?.autorNome ?? 'equipe'}`,
  displayName: 'Chamado · Nova mensagem',
  previewData: {
    protocolo: 'THV-2026-0042',
    destinatarioNome: 'Maria',
    autorNome: 'João (atendente)',
    mensagemPreview: 'Olá, podemos agendar uma chamada para amanhã às 10h?',
    chamadoId: 'demo-id',
  },
} satisfies TemplateEntry