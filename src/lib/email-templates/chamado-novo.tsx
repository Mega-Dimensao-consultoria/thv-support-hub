import * as React from 'react'
import { Button, Link, Section, Text } from '@react-email/components'
import { Shell, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  protocolo?: string
  solicitanteNome?: string
  empresaNome?: string
  departamentoNome?: string
  topicoTitulo?: string
  mensagemPreview?: string
  appUrl?: string
  chamadoId?: string
}

const Email = ({
  protocolo = 'THV-0000',
  solicitanteNome = 'Solicitante',
  empresaNome = '',
  departamentoNome = '',
  topicoTitulo = '',
  mensagemPreview = '',
  appUrl = 'https://chamados.grupothv.com.br',
  chamadoId = '',
}: Props) => {
  const url = `${appUrl}/chamados/${chamadoId}`
  return (
    <Shell
      preview={`Novo chamado ${protocolo} aguarda atendimento`}
      title={`Novo chamado: ${protocolo}`}
    >
      <Text style={styles.paragraph}>
        Um novo chamado foi aberto no seu departamento e aguarda triagem ou atribuição.
      </Text>
      <Section style={styles.meta}>
        <Text style={{ margin: '0 0 6px 0' }}><strong>Protocolo:</strong> {protocolo}</Text>
        <Text style={{ margin: '0 0 6px 0' }}><strong>Solicitante:</strong> {solicitanteNome}{empresaNome ? ` (${empresaNome})` : ''}</Text>
        {departamentoNome && (
          <Text style={{ margin: '0 0 6px 0' }}><strong>Departamento:</strong> {departamentoNome}</Text>
        )}
        {topicoTitulo && (
          <Text style={{ margin: '0 0 6px 0' }}><strong>Tópico:</strong> {topicoTitulo}</Text>
        )}
        {mensagemPreview && (
          <Text style={{ margin: '12px 0 0 0', whiteSpace: 'pre-wrap' as const }}>{mensagemPreview}</Text>
        )}
      </Section>
      <Button href={url} style={styles.cta}>Abrir chamado</Button>
      <Text style={{ ...styles.paragraph, fontSize: '13px', marginTop: '12px' }}>
        Ou acesse: <Link href={url}>{url}</Link>
      </Text>
    </Shell>
  )
}

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    `[Chamado ${d?.protocolo ?? ''}] Novo chamado aguardando atendimento`,
  displayName: 'Chamado · Novo (para gestores)',
  previewData: {
    protocolo: 'THV-2026-0042',
    solicitanteNome: 'Maria Silva',
    empresaNome: 'THV Logística',
    departamentoNome: 'TI',
    topicoTitulo: 'Acesso ao sistema',
    mensagemPreview: 'Não consigo entrar no portal desde ontem.',
    chamadoId: 'demo-id',
  },
} satisfies TemplateEntry