type Cta = {
  label: string;
  url: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function baseLayout(options: {
  preheader: string;
  title: string;
  bodyHtml: string;
  cta?: Cta;
  footerNote?: string;
}): string {
  const { preheader, title, bodyHtml, cta, footerNote } = options;
  const year = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f7f8fc;font-family:'Segoe UI',Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">
    ${escapeHtml(preheader)}
  </div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f7f8fc;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid rgba(15,23,42,0.08);box-shadow:0 12px 40px rgba(15,23,42,0.06);">
          <tr>
            <td style="background:linear-gradient(135deg,#6d5efc 0%,#8b5cf6 100%);padding:28px 32px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="width:40px;height:40px;border-radius:999px;background:rgba(255,255,255,0.2);text-align:center;vertical-align:middle;color:#fff;font-weight:800;font-size:18px;line-height:40px;">C</td>
                  <td style="padding-left:12px;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.02em;">Cirvia</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 16px;">
              <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;font-weight:700;color:#0f172a;">${escapeHtml(title)}</h1>
              <div style="font-size:15px;line-height:1.65;color:#475569;">
                ${bodyHtml}
              </div>
              ${
                cta
                  ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 8px;">
                      <tr>
                        <td style="border-radius:14px;background:linear-gradient(135deg,#6d5efc 0%,#8b5cf6 100%);">
                          <a href="${escapeHtml(cta.url)}" style="display:inline-block;padding:14px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:14px;">
                            ${escapeHtml(cta.label)}
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0;font-size:12px;line-height:1.5;color:#94a3b8;word-break:break-all;">
                      Or copy this link:<br />
                      <a href="${escapeHtml(cta.url)}" style="color:#6d5efc;text-decoration:none;">${escapeHtml(cta.url)}</a>
                    </p>`
                  : ''
              }
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;">
              <div style="border-top:1px solid rgba(15,23,42,0.08);padding-top:20px;font-size:12px;line-height:1.6;color:#94a3b8;">
                ${footerNote ? `<p style="margin:0 0 8px;">${escapeHtml(footerNote)}</p>` : ''}
                <p style="margin:0;">&copy; ${year} Cirvia. Find your people. Build real connections.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function emailVerificationTemplate(verifyUrl: string): { subject: string; html: string } {
  return {
    subject: 'Verify your Cirvia email',
    html: baseLayout({
      preheader: 'Confirm your email to start discovering verified gatherings on Cirvia.',
      title: 'Verify your email',
      bodyHtml: `
        <p style="margin:0 0 12px;">Welcome to Cirvia — the premium verified social discovery platform.</p>
        <p style="margin:0 0 12px;">Please confirm your email address to unlock bookings, host tools, and trusted community features.</p>
        <p style="margin:0;">This link expires in <strong>24 hours</strong>.</p>
      `,
      cta: { label: 'Verify email address', url: verifyUrl },
      footerNote: 'If you did not create a Cirvia account, you can safely ignore this email.',
    }),
  };
}

export function passwordResetTemplate(otp: string, resetToken: string): { subject: string; html: string } {
  return {
    subject: 'Reset your Cirvia password',
    html: baseLayout({
      preheader: `Your Cirvia password reset code is ${otp}.`,
      title: 'Reset your password',
      bodyHtml: `
        <p style="margin:0 0 12px;">We received a request to reset your Cirvia password.</p>
        <p style="margin:0 0 16px;">Use this one-time code:</p>
        <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700;color:#6d5efc;text-align:center;background:#f5f3ff;border-radius:16px;padding:16px;">${escapeHtml(otp)}</p>
        <p style="margin:0;font-size:13px;color:#64748b;">Reset token (if needed): <code style="background:#f1f5f9;padding:2px 6px;border-radius:6px;">${escapeHtml(resetToken)}</code></p>
        <p style="margin:16px 0 0;">This code expires in <strong>15 minutes</strong>.</p>
      `,
      footerNote: 'If you did not request a password reset, ignore this email or contact support.',
    }),
  };
}

export function securityAlertTemplate(message: string): { subject: string; html: string } {
  return {
    subject: 'Cirvia security alert',
    html: baseLayout({
      preheader: 'Important security notice for your Cirvia account.',
      title: 'Security alert',
      bodyHtml: `<p style="margin:0;">${escapeHtml(message)}</p>`,
      footerNote: 'If this was not you, reset your password immediately.',
    }),
  };
}

export function simpleNoticeTemplate(
  subject: string,
  title: string,
  paragraphs: string[],
  cta?: Cta,
): { subject: string; html: string } {
  const bodyHtml = paragraphs
    .map((p) => `<p style="margin:0 0 12px;">${escapeHtml(p)}</p>`)
    .join('');

  return {
    subject,
    html: baseLayout({
      preheader: paragraphs[0] ?? title,
      title,
      bodyHtml,
      ...(cta ? { cta } : {}),
    }),
  };
}
