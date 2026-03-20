import nodemailer from "nodemailer";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587");
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
}

export async function sendCommentReplyNotification({
  recipientEmail,
  recipientName,
  originalComment,
  replyContent,
  postTitle,
  postSlug,
  siteBaseUrl,
}: {
  recipientEmail: string;
  recipientName: string;
  originalComment: string;
  replyContent: string;
  postTitle: string;
  postSlug: string;
  siteBaseUrl: string;
}): Promise<boolean> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn("[Email] SMTP not configured — skipping notification");
    return false;
  }

  const fromAddress = process.env.SMTP_FROM || process.env.SMTP_USER || "";
  const postUrl = `${siteBaseUrl}/${postSlug}`;

  const truncatedComment = originalComment.length > 200 
    ? originalComment.substring(0, 200) + "..." 
    : originalComment;

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f6f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <tr>
            <td style="background-color:#000A24;padding:24px 32px;text-align:center;">
              <h1 style="color:#31D5FF;margin:0;font-size:22px;font-weight:700;">Psicometria Online</h1>
              <p style="color:#a0b4c8;margin:4px 0 0;font-size:13px;">Blog Acadêmico</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 16px;">
                Olá, <strong>${escapeHtml(recipientName)}</strong>!
              </p>
              <p style="color:#333;font-size:15px;line-height:1.6;margin:0 0 24px;">
                Seu comentário no post <strong>"${escapeHtml(postTitle)}"</strong> recebeu uma resposta da nossa equipe.
              </p>

              <div style="background-color:#f8f9fa;border-left:3px solid #6B7280;border-radius:4px;padding:16px;margin:0 0 16px;">
                <p style="color:#6B7280;font-size:12px;margin:0 0 8px;font-weight:600;text-transform:uppercase;">Seu comentário:</p>
                <p style="color:#555;font-size:14px;line-height:1.5;margin:0;font-style:italic;">"${escapeHtml(truncatedComment)}"</p>
              </div>

              <div style="background-color:#E8F8FF;border-left:3px solid:#31D5FF;border-radius:4px;padding:16px;margin:0 0 24px;">
                <p style="color:#31D5FF;font-size:12px;margin:0 0 8px;font-weight:600;text-transform:uppercase;">Nossa resposta:</p>
                <p style="color:#333;font-size:14px;line-height:1.5;margin:0;">${escapeHtml(replyContent)}</p>
              </div>

              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 auto;">
                <tr>
                  <td style="background-color:#31D5FF;border-radius:6px;padding:12px 28px;">
                    <a href="${postUrl}" style="color:#000A24;text-decoration:none;font-size:14px;font-weight:600;">Ver post completo</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f8f9fa;padding:20px 32px;text-align:center;border-top:1px solid #eee;">
              <p style="color:#999;font-size:12px;margin:0;">
                Você recebeu este e-mail porque deixou um comentário no blog Psicometria Online.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    await transporter.sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject: `Seu comentário em "${escapeHtml(postTitle)}" foi respondido — Psicometria Online`,
      html,
    });
    console.log(`[Email] Reply notification sent to ${recipientEmail}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Failed to send notification:`, error.message);
    return false;
  }
}
