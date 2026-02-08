'use server'

import { resend } from './resend'
import { emailConfig } from './config'
import { generateInvitationEmail } from './templates/invitation'
import { logError } from '@/lib/error-logger'

type Locale = 'en' | 'ja' | 'zh' | 'es'

interface SendInvitationEmailParams {
  to: string
  invitedByName: string
  tenantName: string
  role: string
  token: string
  expiresAt: Date
  locale?: Locale
}

export async function sendInvitationEmail(params: SendInvitationEmailParams): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const acceptUrl = `${emailConfig.appUrl}/invite/accept?token=${params.token}`

    const { subject, html, text } = generateInvitationEmail({
      invitedByName: params.invitedByName,
      tenantName: params.tenantName,
      role: params.role,
      acceptUrl,
      expiresAt: params.expiresAt,
      locale: params.locale,
    })

    const { error } = await resend.emails.send({
      from: `${emailConfig.appName} <${emailConfig.fromEmail}>`,
      to: params.to,
      subject,
      html,
      text,
    })

    if (error) {
      console.error('Resend error:', error)
      await logError({
        message: error.message,
        type: 'api',
        severity: 'error',
        metadata: {
          to: params.to,
          resendError: error,
          context: 'sendInvitationEmail',
        },
      })
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const error = err instanceof Error ? err : new Error('Unknown error sending email')
    console.error('Email send error:', error)
    await logError({
      message: error.message,
      stack: error.stack,
      type: 'api',
      severity: 'error',
      metadata: {
        to: params.to,
        context: 'sendInvitationEmail',
      },
    })
    return { success: false, error: error.message }
  }
}
