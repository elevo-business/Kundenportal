/**
 * ELEVO — E-Mail Benachrichtigungen
 * 
 * Setup:
 * 1. Google Workspace → App-Passwort generieren (2FA muss aktiv sein)
 * 2. In .env setzen: SMTP_USER=hey@elevo.solutions, SMTP_PASS=app-passwort
 */

const nodemailer = require('nodemailer');

let transporter = null;

function isEmailConfigured() {
  return !!(process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter) return transporter;
  if (!isEmailConfigured()) return null;

  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log('E-Mail-Benachrichtigungen aktiv.');
  return transporter;
}

// ═══ TEMPLATES ═══

function baseTemplate(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#05070E;font-family:'Helvetica Neue',Arial,sans-serif;color:#E2E8F0;">
<div style="max-width:560px;margin:0 auto;padding:40px 24px;">
  <div style="text-align:center;margin-bottom:32px;">
    <span style="font-size:16px;font-weight:700;letter-spacing:0.28em;text-transform:uppercase;color:#E2E8F0;">ELE<span style="color:#3B82F6;">V</span>O</span>
  </div>
  <div style="background:#111827;border:1px solid #1E2A42;padding:32px 28px;">
    ${content}
  </div>
  <div style="text-align:center;margin-top:24px;font-size:11px;color:#516179;letter-spacing:0.06em;">
    ELEVO · Digital · Strategie · Umsetzung
  </div>
</div>
</body></html>`;
}

function btnTemplate(url, text) {
  return `<div style="text-align:center;margin:28px 0 8px;">
    <a href="${url}" style="display:inline-block;padding:14px 32px;background:#3B82F6;color:#FFFFFF;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;border-radius:100px;">${text}</a>
  </div>`;
}

// ═══ MAIL FUNCTIONS ═══

async function sendWelcome(to, companyName, portalUrl, password) {
  const t = getTransporter();
  if (!t) return;

  const html = baseTemplate(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#FFFFFF;">Willkommen, ${companyName}.</h2>
    <p style="font-size:14px;line-height:1.7;color:#8899B0;margin:0 0 20px;">
      Dein Projekt-Portal ist bereit. Hier sammelst du alles, was wir für deine Website brauchen — Briefing, Dateien, Feedback.
    </p>
    <div style="background:#0A0E1A;border:1px solid #1E2A42;padding:16px 20px;margin:20px 0;">
      <div style="font-size:10px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#516179;margin-bottom:8px;">Dein Zugang</div>
      <div style="font-size:13px;color:#E2E8F0;margin-bottom:4px;">Passwort: <strong style="color:#3B82F6;">${password}</strong></div>
    </div>
    ${btnTemplate(portalUrl, 'Zum Portal')}
    <p style="font-size:12px;color:#516179;margin:16px 0 0;text-align:center;">
      Du kannst das Portal jederzeit besuchen und ergänzen.
    </p>
  `);

  try {
    await t.sendMail({
      from: `"ELEVO" <${process.env.SMTP_USER}>`,
      to,
      subject: `${companyName} — Dein Projekt-Portal ist bereit`,
      html,
    });
    console.log(`✉ Welcome-Mail → ${to}`);
  } catch (e) {
    console.error('Mail-Fehler (Welcome):', e.message);
  }
}

async function sendStatusUpdate(to, companyName, status, note, portalUrl) {
  const t = getTransporter();
  if (!t) return;

  const statusLabels = {
    briefing: 'Briefing',
    design: 'Design',
    development: 'Entwicklung',
    review: 'Review',
    live: 'Live',
  };

  const statusColors = {
    briefing: '#F59E0B',
    design: '#818CF8',
    development: '#3B82F6',
    review: '#F59E0B',
    live: '#10B981',
  };

  const label = statusLabels[status] || status;
  const color = statusColors[status] || '#3B82F6';

  const html = baseTemplate(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#FFFFFF;">Status-Update</h2>
    <p style="font-size:14px;line-height:1.7;color:#8899B0;margin:0 0 20px;">
      Dein Projekt <strong style="color:#E2E8F0;">${companyName}</strong> hat einen neuen Status.
    </p>
    <div style="text-align:center;margin:24px 0;">
      <span style="display:inline-block;padding:8px 20px;background:${color}18;border:1px solid ${color}40;color:${color};font-size:13px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">${label}</span>
    </div>
    ${note ? `<p style="font-size:14px;line-height:1.7;color:#8899B0;margin:0 0 20px;text-align:center;font-style:italic;">${note}</p>` : ''}
    ${btnTemplate(portalUrl, 'Zum Portal')}
  `);

  try {
    await t.sendMail({
      from: `"ELEVO" <${process.env.SMTP_USER}>`,
      to,
      subject: `${companyName} — Neuer Status: ${label}`,
      html,
    });
    console.log(`✉ Status-Mail → ${to} (${label})`);
  } catch (e) {
    console.error('Mail-Fehler (Status):', e.message);
  }
}

async function sendFeedbackNotification(adminEmail, companyName, authorName, message) {
  const t = getTransporter();
  if (!t) return;

  const html = baseTemplate(`
    <h2 style="font-size:22px;font-weight:700;margin:0 0 8px;color:#FFFFFF;">Neues Feedback</h2>
    <p style="font-size:14px;line-height:1.7;color:#8899B0;margin:0 0 20px;">
      <strong style="color:#E2E8F0;">${companyName}</strong> hat Feedback hinterlassen.
    </p>
    <div style="background:#0A0E1A;border:1px solid #1E2A42;padding:16px 20px;margin:20px 0;">
      <div style="font-size:11px;color:#3B82F6;font-weight:700;margin-bottom:6px;">${authorName || 'Kunde'}</div>
      <div style="font-size:14px;color:#E2E8F0;line-height:1.7;white-space:pre-wrap;">${message}</div>
    </div>
  `);

  try {
    await t.sendMail({
      from: `"ELEVO Portal" <${process.env.SMTP_USER}>`,
      to: adminEmail,
      subject: `Feedback von ${companyName}`,
      html,
    });
    console.log(`✉ Feedback-Notification → ${adminEmail}`);
  } catch (e) {
    console.error('Mail-Fehler (Feedback):', e.message);
  }
}

module.exports = { isEmailConfigured, sendWelcome, sendStatusUpdate, sendFeedbackNotification };
