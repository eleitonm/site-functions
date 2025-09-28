// netlify/functions/mail.js
const nodemailer = require("nodemailer");

// --- CORS (permite desde cualquier origen). Si quieres restringir, pon tu dominio en CORS_ORIGIN ---
const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
const corsHeaders = {
  "Access-Control-Allow-Origin": CORS_ORIGIN,
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "86400",
  "Content-Type": "application/json",
};

// --- (Opcional) genera tu HTML universal si envías {to_email,title,...} ---
function renderUniversalEmail({
  title,
  preheader = "",
  customer_name = "Cliente",
  intro_html = "",
  body_html = "",
  cta_label = "Ir a El Ancla",
  cta_url = "https://elancla.store",
  to_email = "",
  brand_logo_url = "https://jszgeoosgpozjlvohrjy.supabase.co/storage/v1/object/public/assets//logo%20morado.png",
  brand_color = "#5A61E5",
  accent_color = "#F2BF53",
  year = new Date().getFullYear(),
} = {}) {
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${title}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>@media (max-width:600px){.container{width:100%!important}.px{padding-left:16px!important;padding-right:16px!important}.py{padding-top:16px!important;padding-bottom:16px!important}.btn{display:block!important;width:100%!important;text-align:center!important}}a{text-decoration:none}img{border:0;line-height:100%;outline:none;text-decoration:none}</style>
</head><body style="margin:0;padding:0;background:#f6f7fb;">
<div style="display:none;font-size:1px;color:#f6f7fb;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">${preheader}</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background:#f6f7fb;">
<tr><td align="center" style="padding:24px;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="600" class="container" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
    <tr><td align="center" style="background:${brand_color};padding:20px;">
      <img src="${brand_logo_url}" width="140" alt="El Ancla CR" style="display:block;max-width:160px;width:140px;">
    </td></tr>
    <tr><td style="background:${accent_color};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
    <tr><td class="px py" style="padding:28px 32px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827;">
      <h1 style="margin:0 0 8px;font-size:22px;line-height:1.3;font-weight:800;color:#111827;">${title}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151;">Hola <strong>${customer_name}</strong>,</p>
      <div style="font-size:15px;line-height:1.6;color:#374151;margin-bottom:16px;">${intro_html}</div>
      ${body_html}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:24px auto;">
        <tr><td bgcolor="${brand_color}" style="border-radius:10px;">
          <a href="${cta_url}" class="btn" style="display:inline-block;padding:14px 22px;font-size:15px;font-weight:700;color:#ffffff;background:${brand_color};border-radius:10px;">${cta_label}</a>
        </td></tr>
      </table>
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:8px;">
        <tr><td style="border-top:1px solid #eee;padding-top:16px;">
          <p style="margin:0 0 6px;font-size:13px;color:#374151;">¿Necesitás ayuda? Escríbenos a
            <a href="mailto:info@elancla.store" style="color:${brand_color};">info@elancla.store</a> o por WhatsApp:
            <a href="https://wa.me/50689422525" style="color:${brand_color};">+506 8942 2525</a>.
          </p>
          <p style="margin:0;font-size:12px;color:#6b7280;">Este correo fue enviado a <strong>${to_email}</strong>.</p>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:16px 24px 24px;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">© ${year} El Ancla CR • Todos los derechos reservados</p>
    </td></tr>
  </table>
</td></tr></table></body></html>`;
}

exports.handler = async (event) => {
  // Preflight CORS
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders, body: "" };
  }

  // GET (sanity check)
  if (event.httpMethod === "GET") {
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true, fn: "mail", method: "GET" }) };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ ok: false, error: "METHOD_NOT_ALLOWED" }) };
  }

  // Parse body
  let payload = {};
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ ok: false, error: "BAD_JSON" }) };
  }

  // SMTP (iCloud)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.mail.me.com",
    port: Number(process.env.SMTP_PORT || 587),
    secure: false, // STARTTLS
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    authMethod: "LOGIN",
  });

  try { await transporter.verify(); } catch (e) { console.error("SMTP verify:", e.message); }

  try {
    // Caso 1: envío simple
    if (payload.to && payload.subject && payload.html) {
      await transporter.sendMail({
        from: `"${process.env.FROM_NAME || "El Ancla CR"}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        replyTo: payload.replyTo || payload.reply_to || process.env.FROM_EMAIL || process.env.SMTP_USER,
      });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    }

    // Caso 2: universal
    if (payload.to_email && payload.title) {
      const html = renderUniversalEmail({ ...payload, year: payload.year || new Date().getFullYear() });
      await transporter.sendMail({
        from: `"${process.env.FROM_NAME || "El Ancla CR"}" <${process.env.FROM_EMAIL || process.env.SMTP_USER}>`,
        to: payload.to_email,
        subject: payload.title,
        html,
        replyTo: payload.reply_to || payload.replyTo || process.env.FROM_EMAIL || process.env.SMTP_USER,
      });
      return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ ok: true }) };
    }

    return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ ok: false, error: "MISSING_FIELDS" }) };
  } catch (e) {
    console.error("MAIL_FAILED:", e);
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ ok: false, error: "MAIL_FAILED" }) };
  }
};
