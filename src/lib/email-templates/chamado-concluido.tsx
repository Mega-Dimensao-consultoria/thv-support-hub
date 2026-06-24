import * as React from 'react'
import { Button, Link, Section, Text } from '@react-email/components'
import { Shell, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  protocolo?: string
  destinatarioNome?: string
  atendenteNome?: string
  appUrl?: string
  chamadoId?: string
}

const Email = ({
  protocolo = 'THV-0000',
  destinatarioNome = '',
  atendenteNome = '',
  appUrl = 'https://chamados.grupothv.com.br',
  chamadoId = '',
}: Props) => {
  const url = `${appUrl}/chamados/${chamadoId}`
  return (
    <Shell
      preview={`Chamado ${protocolo} concluído — avalie o atendimento`}
      title={`Chamado concluído: ${protocolo}`}
    >
      {destinatarioNome && <Text style={styles.paragraph}>Olá, {destinatarioNome}!</Text>}
      <Text style={styles.paragraph}>
        Seu chamado foi concluído{atendenteNome ? ` por ${atendenteNome}` : ''}. Sua avaliação nos ajuda a melhorar continuamente.
      </Text>
      <Section style={styles.meta}>
        <Text style={{ margin: '0 0 6px 0' }}><strong>Protocolo:</strong> {protocolo}</Text>
        <Text style={{ margin: 0 }}>Acesse o chamado para registrar sua avaliação.</Text>
      </Section>
      <Button href={url} style={styles.cta}>Avaliar atendimento</Button>
      <Text style={{ ...styles.paragraph, fontSize: '13px', marginTop: '12px' }}>
        Ou acesse: <Link href={url}>{url}</Link>
      </Text>
    </Shell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `[Chamado ${d?.protocolo ?? ''}] Concluído — avalie o atendimento`,
  displayName: 'Chamado · Concluído (avaliação)',
  previewData: {
    protocolo: 'THV-2026-0042',
    destinatarioNome: 'Maria',
    atendenteNome: 'João',
    chamadoId: 'demo-id',
  },
} satisfies TemplateEntry