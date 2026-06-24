import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'

const main = {
  backgroundColor: '#ffffff',
  fontFamily:
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  color: '#0f172a',
  margin: 0,
  padding: 0,
}

const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '32px 24px',
}

const header = {
  borderBottom: '3px solid #2563eb',
  paddingBottom: '12px',
  marginBottom: '24px',
}

const brand = {
  fontSize: '14px',
  fontWeight: 700,
  letterSpacing: '1px',
  color: '#2563eb',
  textTransform: 'uppercase' as const,
  margin: 0,
}

const heading = {
  fontSize: '22px',
  fontWeight: 700,
  margin: '0 0 12px 0',
  lineHeight: '1.3',
}

const paragraph = {
  fontSize: '15px',
  lineHeight: '1.6',
  color: '#334155',
  margin: '0 0 16px 0',
}

const meta = {
  backgroundColor: '#f8fafc',
  border: '1px solid #e2e8f0',
  borderRadius: '6px',
  padding: '16px',
  margin: '20px 0',
  fontSize: '14px',
  color: '#475569',
}

const cta = {
  display: 'inline-block',
  backgroundColor: '#2563eb',
  color: '#ffffff',
  textDecoration: 'none',
  padding: '12px 24px',
  borderRadius: '6px',
  fontWeight: 600,
  fontSize: '14px',
  marginTop: '8px',
}

const footer = {
  fontSize: '12px',
  color: '#94a3b8',
  marginTop: '32px',
  borderTop: '1px solid #e2e8f0',
  paddingTop: '16px',
}

export const styles = { main, container, header, brand, heading, paragraph, meta, cta, footer }

interface ShellProps {
  preview: string
  title: string
  children: React.ReactNode
}

export function Shell({ preview, title, children }: ShellProps) {
  return (
    <Html lang="pt-BR" dir="ltr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={brand}>THV Connect · Chamados</Text>
          </Section>
          <Heading style={heading}>{title}</Heading>
          {children}
          <Text style={footer}>
            Esta é uma mensagem automática do sistema de chamados do Grupo THV.
            Você está recebendo porque está envolvido(a) neste atendimento.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}