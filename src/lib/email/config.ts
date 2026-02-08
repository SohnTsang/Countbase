// Email configuration
// Easy to change sender email when you have your own domain

export const emailConfig = {
  // Change this when you have your own domain verified in Resend
  fromEmail: process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev',

  // App name shown in emails
  appName: 'Inventory System',

  // Base URL for email links
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  // Invitation expiry in hours
  invitationExpiryHours: 48,
}
