import { Resend } from 'resend'

let resendClient: Resend | null = null

export function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not set. Please add it to your .env.local file.')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}
