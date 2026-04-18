import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY || 'mock')
const BRAND_PRIMARY = '#0EA5E9'
const BRAND_DARK = '#0F172A'
const BRAND_BG = '#F8FAFC'

export async function sendEmail({
  to,
  subject,
  html,
  from = 'Creorga <noreply@creorga.lu>',
}: {
  to: string
  subject: string
  html: string
  from?: string
}) {
  try {
    if (!process.env.RESEND_API_KEY) {
      console.log('[Email MOCK]', { to, subject })
      return { id: 'mock_' + Date.now(), mocked: true }
    }
    const result = await resend.emails.send({ from, to, subject, html })
    console.log('[Email] Envoyé à', to, '-', subject)
    return result
  } catch (err) {
    console.error('[Email] Erreur d\'envoi:', err)
    throw err
  }
}

// --- Layout commun pour tous les emails ---
function layout(inner: string, preheader = ''): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Creorga</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:${BRAND_DARK};">
<span style="display:none !important;opacity:0;color:transparent;height:0;width:0;overflow:hidden;">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND_BG};padding:24px 0;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(15,23,42,0.06);">
      <tr>
        <td style="background:linear-gradient(135deg,${BRAND_PRIMARY} 0%,#0284C7 100%);padding:28px 32px;">
          <table width="100%"><tr>
            <td style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">Creorga</td>
            <td align="right" style="color:rgba(255,255,255,0.85);font-size:12px;">OS pour restaurants</td>
          </tr></table>
        </td>
      </tr>
      <tr><td style="padding:32px;">${inner}</td></tr>
      <tr>
        <td style="background:#F1F5F9;padding:20px 32px;text-align:center;font-size:12px;color:#64748B;">
          Creorga SARL · Luxembourg<br />
          <a href="https://creorga.lu" style="color:${BRAND_PRIMARY};text-decoration:none;">creorga.lu</a> ·
          <a href="mailto:support@creorga.lu" style="color:${BRAND_PRIMARY};text-decoration:none;">support@creorga.lu</a>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`
}

function button(href: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:${BRAND_PRIMARY};">
    <a href="${href}" style="display:inline-block;padding:14px 28px;color:#ffffff;font-weight:600;text-decoration:none;border-radius:8px;">${label}</a>
  </td></tr></table>`
}

// --- Templates ---
export const emailTemplates = {
  welcome: (name: string) => layout(`
    <h1 style="margin:0 0 16px;font-size:24px;color:${BRAND_DARK};">Bienvenue ${name} !</h1>
    <p style="font-size:15px;line-height:1.6;color:#475569;">Votre compte Creorga est prêt. Vous disposez de <strong>14 jours d'essai gratuit</strong> pour explorer toutes les fonctionnalités.</p>
    <p style="font-size:15px;line-height:1.6;color:#475569;">Voici quelques étapes pour commencer :</p>
    <ul style="color:#475569;line-height:1.8;font-size:14px;">
      <li>Configurer votre carte et vos tables</li>
      <li>Inviter votre équipe</li>
      <li>Lancer votre premier service</li>
    </ul>
    <div style="margin:28px 0;">${button('https://app.creorga.lu/welcome', 'Commencer')}</div>
    <p style="font-size:13px;color:#94A3B8;">Besoin d'aide ? Répondez à cet email, nous sommes là.</p>
  `, `Bienvenue sur Creorga, ${name}`),

  invoicePaid: (invoice: { number: string; amount: number; date: string; url?: string }) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Paiement reçu</h1>
    <p style="font-size:15px;color:#475569;">Merci ! Nous avons bien reçu votre paiement.</p>
    <table width="100%" style="margin:20px 0;border:1px solid #E2E8F0;border-radius:8px;">
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Facture</td><td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;text-align:right;font-weight:600;">${invoice.number}</td></tr>
      <tr><td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;color:#64748B;font-size:13px;">Date</td><td style="padding:12px 16px;border-bottom:1px solid #E2E8F0;text-align:right;">${invoice.date}</td></tr>
      <tr><td style="padding:12px 16px;color:#64748B;font-size:13px;">Montant</td><td style="padding:12px 16px;text-align:right;font-weight:700;color:${BRAND_PRIMARY};font-size:18px;">${invoice.amount.toFixed(2)} €</td></tr>
    </table>
    ${invoice.url ? `<div style="margin:20px 0;">${button(invoice.url, 'Télécharger la facture')}</div>` : ''}
  `, `Paiement reçu - Facture ${invoice.number}`),

  reservationReminder: (reservation: { name: string; date: string; time: string; guests: number; restaurant: string }) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Votre réservation demain</h1>
    <p style="font-size:15px;color:#475569;">Bonjour ${reservation.name}, nous avons hâte de vous accueillir !</p>
    <table width="100%" style="margin:20px 0;background:#F8FAFC;border-radius:8px;padding:8px;">
      <tr><td style="padding:10px 16px;color:#64748B;">Restaurant</td><td style="padding:10px 16px;text-align:right;font-weight:600;">${reservation.restaurant}</td></tr>
      <tr><td style="padding:10px 16px;color:#64748B;">Date</td><td style="padding:10px 16px;text-align:right;font-weight:600;">${reservation.date}</td></tr>
      <tr><td style="padding:10px 16px;color:#64748B;">Heure</td><td style="padding:10px 16px;text-align:right;font-weight:600;">${reservation.time}</td></tr>
      <tr><td style="padding:10px 16px;color:#64748B;">Personnes</td><td style="padding:10px 16px;text-align:right;font-weight:600;">${reservation.guests}</td></tr>
    </table>
    <p style="font-size:13px;color:#94A3B8;">Un empêchement ? Annulez ou modifiez votre réservation directement depuis l'email de confirmation.</p>
  `, `Rappel : réservation ${reservation.date}`),

  passwordReset: (link: string) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Réinitialisation du mot de passe</h1>
    <p style="font-size:15px;color:#475569;">Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous (lien valide 1 heure).</p>
    <div style="margin:28px 0;">${button(link, 'Réinitialiser mon mot de passe')}</div>
    <p style="font-size:13px;color:#94A3B8;">Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email.</p>
    <p style="font-size:12px;color:#CBD5E1;word-break:break-all;">Ou copiez ce lien : ${link}</p>
  `, `Réinitialisation mot de passe Creorga`),

  trialEnding: (daysLeft: number) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Votre essai se termine dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}</h1>
    <p style="font-size:15px;color:#475569;">Pour continuer à utiliser Creorga sans interruption, choisissez votre formule avant la fin de la période d'essai.</p>
    <table width="100%" style="margin:24px 0;">
      <tr>
        <td style="padding:12px;border:1px solid #E2E8F0;border-radius:8px;text-align:center;">
          <div style="font-weight:700;color:${BRAND_DARK};">Starter</div>
          <div style="font-size:20px;color:${BRAND_PRIMARY};font-weight:700;margin:6px 0;">39€/mois</div>
          <div style="font-size:12px;color:#94A3B8;">1 établissement</div>
        </td>
      </tr>
    </table>
    <div style="margin:24px 0;">${button('https://app.creorga.lu/billing', 'Choisir mon abonnement')}</div>
  `, `Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai`),

  newOrder: (order: { number: string; table: string; items: number; total: number }) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Nouvelle commande ${order.number}</h1>
    <p style="font-size:15px;color:#475569;">Table <strong>${order.table}</strong> · ${order.items} article${order.items > 1 ? 's' : ''} · <strong style="color:${BRAND_PRIMARY};">${order.total.toFixed(2)} €</strong></p>
    <div style="margin:24px 0;">${button('https://app.creorga.lu/pos/kitchen', 'Voir en cuisine')}</div>
  `, `Commande ${order.number} - Table ${order.table}`),

  invoiceDue: (invoice: { number: string; amount: number; dueDate: string }) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Facture à régler</h1>
    <p style="font-size:15px;color:#475569;">Votre facture ${invoice.number} d'un montant de <strong>${invoice.amount.toFixed(2)} €</strong> arrive à échéance le ${invoice.dueDate}.</p>
    <div style="margin:24px 0;">${button('https://app.creorga.lu/billing', 'Régler maintenant')}</div>
  `, `Facture ${invoice.number} à échéance`),

  teamInvite: (inviter: string, link: string) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Invitation équipe</h1>
    <p style="font-size:15px;color:#475569;"><strong>${inviter}</strong> vous invite à rejoindre son équipe sur Creorga.</p>
    <div style="margin:24px 0;">${button(link, 'Accepter l\'invitation')}</div>
  `, `${inviter} vous invite sur Creorga`),

  orderReady: (order: { number: string; customer: string }) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Votre commande est prête !</h1>
    <p style="font-size:15px;color:#475569;">Bonjour ${order.customer}, votre commande <strong>${order.number}</strong> vient d'être préparée et vous attend.</p>
  `, `Commande ${order.number} prête`),

  weeklyReport: (stats: { revenue: number; orders: number; topItem: string }) => layout(`
    <h1 style="margin:0 0 16px;font-size:22px;">Votre rapport hebdomadaire</h1>
    <table width="100%" style="margin:20px 0;">
      <tr>
        <td style="padding:16px;background:#F8FAFC;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">CA</div>
          <div style="font-size:22px;font-weight:700;color:${BRAND_PRIMARY};margin-top:4px;">${stats.revenue.toFixed(0)} €</div>
        </td>
        <td width="8"></td>
        <td style="padding:16px;background:#F8FAFC;border-radius:8px;text-align:center;width:33%;">
          <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Commandes</div>
          <div style="font-size:22px;font-weight:700;color:${BRAND_DARK};margin-top:4px;">${stats.orders}</div>
        </td>
      </tr>
    </table>
    <p style="font-size:14px;color:#475569;">Plat star de la semaine : <strong>${stats.topItem}</strong></p>
    <div style="margin:24px 0;">${button('https://app.creorga.lu/owner', 'Voir le rapport complet')}</div>
  `, `Rapport hebdo Creorga`),
}

export default { sendEmail, emailTemplates }
