import { Resend } from 'resend'

// Initialize Resend client
const resendApiKey = process.env.RESEND_API_KEY

if (!resendApiKey) {
  console.warn('RESEND_API_KEY is not set. Email sending will fail.')
}

export const resend = new Resend(resendApiKey)
