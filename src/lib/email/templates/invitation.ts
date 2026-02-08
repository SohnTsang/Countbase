import { emailConfig } from '../config'

type Locale = 'en' | 'ja' | 'zh' | 'es'

interface InvitationEmailData {
  invitedByName: string
  tenantName: string
  role: string
  acceptUrl: string
  expiresAt: Date
  locale?: Locale
}

// Localized email content
const translations: Record<Locale, {
  subject: (tenantName: string) => string
  greeting: string
  invitedBy: (inviterName: string, tenantName: string) => string
  roleText: (role: string) => string
  actionText: string
  buttonText: string
  expiryWarning: (hours: number) => string
  ignoreText: string
  footer: string
}> = {
  en: {
    subject: (tenantName) => `You're invited to join ${tenantName}`,
    greeting: 'Hello,',
    invitedBy: (inviterName, tenantName) =>
      `${inviterName} has invited you to join <strong>${tenantName}</strong> on ${emailConfig.appName}.`,
    roleText: (role) => `You have been assigned the role of <strong>${role}</strong>.`,
    actionText: 'Click the button below to create your account and get started.',
    buttonText: 'Accept Invitation',
    expiryWarning: (hours) => `This invitation will expire in ${hours} hours.`,
    ignoreText: 'If you did not expect this invitation, you can safely ignore this email.',
    footer: `This email was sent by ${emailConfig.appName}`,
  },
  ja: {
    subject: (tenantName) => `${tenantName} への招待`,
    greeting: 'こんにちは、',
    invitedBy: (inviterName, tenantName) =>
      `${inviterName} さんが、${emailConfig.appName} の <strong>${tenantName}</strong> にあなたを招待しました。`,
    roleText: (role) => `あなたの役割は <strong>${role}</strong> です。`,
    actionText: '下のボタンをクリックしてアカウントを作成してください。',
    buttonText: '招待を受け入れる',
    expiryWarning: (hours) => `この招待は ${hours} 時間後に失効します。`,
    ignoreText: 'この招待に心当たりがない場合は、このメールを無視してください。',
    footer: `このメールは ${emailConfig.appName} から送信されました`,
  },
  zh: {
    subject: (tenantName) => `邀请您加入 ${tenantName}`,
    greeting: '您好，',
    invitedBy: (inviterName, tenantName) =>
      `${inviterName} 邀请您加入 ${emailConfig.appName} 的 <strong>${tenantName}</strong>。`,
    roleText: (role) => `您被分配的角色是 <strong>${role}</strong>。`,
    actionText: '点击下面的按钮创建您的账户。',
    buttonText: '接受邀请',
    expiryWarning: (hours) => `此邀请将在 ${hours} 小时后过期。`,
    ignoreText: '如果您没有预料到此邀请，可以安全地忽略此电子邮件。',
    footer: `此邮件由 ${emailConfig.appName} 发送`,
  },
  es: {
    subject: (tenantName) => `Has sido invitado a unirte a ${tenantName}`,
    greeting: 'Hola,',
    invitedBy: (inviterName, tenantName) =>
      `${inviterName} te ha invitado a unirte a <strong>${tenantName}</strong> en ${emailConfig.appName}.`,
    roleText: (role) => `Se te ha asignado el rol de <strong>${role}</strong>.`,
    actionText: 'Haz clic en el botón de abajo para crear tu cuenta y comenzar.',
    buttonText: 'Aceptar Invitación',
    expiryWarning: (hours) => `Esta invitación expirará en ${hours} horas.`,
    ignoreText: 'Si no esperabas esta invitación, puedes ignorar este correo electrónico.',
    footer: `Este correo fue enviado por ${emailConfig.appName}`,
  },
}

// Role translations
const roleNames: Record<Locale, Record<string, string>> = {
  en: {
    admin: 'Administrator',
    manager: 'Manager',
    staff: 'Staff',
    readonly: 'Read Only',
  },
  ja: {
    admin: '管理者',
    manager: 'マネージャー',
    staff: 'スタッフ',
    readonly: '閲覧のみ',
  },
  zh: {
    admin: '管理员',
    manager: '经理',
    staff: '员工',
    readonly: '只读',
  },
  es: {
    admin: 'Administrador',
    manager: 'Gerente',
    staff: 'Personal',
    readonly: 'Solo Lectura',
  },
}

export function generateInvitationEmail(data: InvitationEmailData): {
  subject: string
  html: string
  text: string
} {
  const locale = data.locale || 'en'
  const t = translations[locale]
  const roleName = roleNames[locale][data.role] || data.role

  const hoursUntilExpiry = Math.ceil(
    (data.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60)
  )

  const subject = t.subject(data.tenantName)

  const html = `
<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td style="padding: 40px 20px;">
        <table role="presentation" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #10b981; padding: 32px 40px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ${emailConfig.appName}
              </h1>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.5;">
                ${t.greeting}
              </p>

              <p style="margin: 0 0 16px; color: #374151; font-size: 16px; line-height: 1.5;">
                ${t.invitedBy(data.invitedByName, data.tenantName)}
              </p>

              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.5;">
                ${t.roleText(roleName)}
              </p>

              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.5;">
                ${t.actionText}
              </p>

              <!-- Button -->
              <table role="presentation" style="width: 100%;">
                <tr>
                  <td style="text-align: center; padding: 16px 0;">
                    <a href="${data.acceptUrl}"
                       style="display: inline-block; background-color: #10b981; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 6px; font-size: 16px; font-weight: 600;">
                      ${t.buttonText}
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry Warning -->
              <p style="margin: 24px 0 0; padding: 16px; background-color: #fef3c7; border-radius: 6px; color: #92400e; font-size: 14px; line-height: 1.5; text-align: center;">
                ⏰ ${t.expiryWarning(hoursUntilExpiry)}
              </p>

              <!-- URL Fallback -->
              <p style="margin: 24px 0 0; color: #6b7280; font-size: 12px; line-height: 1.5; word-break: break-all;">
                ${locale === 'ja' ? 'ボタンが機能しない場合は、このリンクをコピーしてブラウザに貼り付けてください：' :
                  locale === 'zh' ? '如果按钮不起作用，请复制此链接并粘贴到浏览器中：' :
                  locale === 'es' ? 'Si el botón no funciona, copia y pega este enlace en tu navegador:' :
                  'If the button doesn\'t work, copy and paste this link into your browser:'}<br>
                <a href="${data.acceptUrl}" style="color: #10b981;">${data.acceptUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background-color: #f9fafb; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 12px; line-height: 1.5; text-align: center;">
                ${t.ignoreText}
              </p>
              <p style="margin: 0; color: #9ca3af; font-size: 12px; line-height: 1.5; text-align: center;">
                ${t.footer}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  // Plain text version
  const text = `
${t.greeting}

${t.invitedBy(data.invitedByName, data.tenantName).replace(/<[^>]*>/g, '')}

${t.roleText(roleName).replace(/<[^>]*>/g, '')}

${t.actionText}

${t.buttonText}: ${data.acceptUrl}

${t.expiryWarning(hoursUntilExpiry)}

${t.ignoreText}

${t.footer}
`

  return { subject, html, text }
}
