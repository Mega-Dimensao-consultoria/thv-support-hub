import * as React from 'react'
import { Button, Link, Section, Text } from '@react-email/components'
import { Shell, styles } from './_layout'
import type { TemplateEntry } from './registry'

interface Props {
  protocolo?: string
  atendenteNome?: string
  solicitanteNome?: string
  departamentoNome?: string
  topicoTitulo?: string
  appUrl?: string
  chamadoId?: string
}

const Email = ({
  protocolo = 'THV-0000',
  atendenteNome = 'Atendente',
  solicitanteNome = '',
  departamentoNome = '',
  topicoTitulo = '',
  appUrl = 'https://chamados.grupothv.com.br',
  chamadoId = '',
}: Props) => {
  const url = `${appUrl}/chamados/${chamadoId}`
  return (
    <Shell
      preview={`Você foi atribuído ao chamado ${protocolo}`}
      title={`Chamado atribuído: ${protocolo}`}
    >
      <Text style={styles.paragraph}>Olá, {atendenteNome}!</Text>
      <Text style={styles.paragraph}>
        Você foi designado(a) como atendente deste chamado. Acesse o sistema para iniciar o atendimento.
      </Text>
      <Section style={styles.meta}>
        <Text style={{ margin: '0 0 6px 0' }}><strong>Protocolo:</strong> {protocolo}</Text>
        {solicitanteNome && (
          <Text style={{ margin: '0 0 6px 0' }}><strong>Solicitante:</strong> {solicitanteNome}</Text>
        )}
        {departamentoNome && (
          <Text style={{ margin: '0 0 6px 0' }}><strong>Departamento:</strong> {departamentoNome}</Text>
        )}
        {topicoTitulo && (
          <Text style={{ margin: '0 0 6px 0' }}><strong>Tópico:</strong> {topicoTitulo}</Text>
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
    `[Chamado ${d?.protocolo ?? ''}] Atribuído a você`,
  displayName: 'Chamado · Atribuído ao atendente',
  previewData: {
    protocolo: 'THV-2026-0042',
    atendenteNome: 'João',
    solicitanteNome: 'Maria Silva',
    departamentoNome: 'TI',
    topicoTitulo: 'Acesso ao sistema',
    chamadoId: 'demo-id',
  },
} satisfies TemplateEntry