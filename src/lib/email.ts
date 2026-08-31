import nodemailer from "nodemailer";

export type EmailSendResult = {
  delivered: boolean;
  channel: "resend" | "smtp" | "console" | "none";
  error?: string;
};

/** 是否已配置可对外发信的通道（不含开发环境 console） */
export function isOutboundEmailConfigured() {
  const resend = Boolean(process.env.RESEND_API_KEY?.trim());
  const smtp = Boolean(
    process.env.SMTP_HOST?.trim() &&
      process.env.SMTP_USER?.trim() &&
      process.env.SMTP_PASS?.trim()
  );
  return resend || smtp;
}

/** 生产环境未配邮件时关闭公开重置；开发环境仍可用控制台验证码 */
export function isPasswordResetOpen() {
  if (process.env.NODE_ENV === "development") return true;
  return isOutboundEmailConfigured();
}

function fromAddress() {
  // 避免 noreply@：Outlook/部分服务商更易进垃圾箱。优先用 EMAIL_FROM（建议 auth@/support@）。
  return process.env.EMAIL_FROM || "AI Agent Market <auth@localhost>";
}

async function sendViaResend(to: string, subject: string, html: string, text: string) {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress(),
      to: [to],
      subject,
      html,
      text,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Resend ${res.status}`);
  }
  return "resend" as const;
}

async function sendViaSmtp(to: string, subject: string, html: string, text: string) {
  const host = process.env.SMTP_HOST?.trim();
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  if (!host || !user || !pass) return null;

  const port = Number(process.env.SMTP_PORT || 587);
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  await transporter.sendMail({
    from: fromAddress(),
    to,
    subject,
    html,
    text,
    replyTo: process.env.EMAIL_REPLY_TO?.trim() || undefined,
    headers: {
      "X-Entity-Ref-ID": `${Date.now()}`,
    },
  });
  return "smtp" as const;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<EmailSendResult> {
  const errors: string[] = [];
  // 国内访问 api.resend.com 常被拦，优先 SMTP（smtp.resend.com）更稳
  const order = (process.env.EMAIL_SEND_ORDER || "smtp,resend")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  for (const channel of order) {
    try {
      if (channel === "smtp") {
        const viaSmtp = await sendViaSmtp(
          input.to,
          input.subject,
          input.html,
          input.text
        );
        if (viaSmtp) return { delivered: true, channel: viaSmtp };
      } else if (channel === "resend") {
        const viaResend = await sendViaResend(
          input.to,
          input.subject,
          input.html,
          input.text
        );
        if (viaResend) return { delivered: true, channel: viaResend };
      }
    } catch (error) {
      errors.push(
        `${channel}: ${error instanceof Error ? error.message : "发送失败"}`
      );
    }
  }

  if (process.env.NODE_ENV === "development") {
    console.log("\n========================================");
    console.log("邮件（仅开发环境控制台）");
    console.log(`收件人: ${input.to}`);
    console.log(`主题: ${input.subject}`);
    console.log(input.text);
    if (errors.length) console.log(`上游失败: ${errors.join(" | ")}`);
    console.log("========================================\n");
    return { delivered: true, channel: "console" };
  }

  return {
    delivered: false,
    channel: "none",
    error: errors.join(" | ") || "未配置邮件通道",
  };
}

/** 密码重置验证码邮件 */
export async function sendVerificationEmail(
  email: string,
  code: string
): Promise<{ delivered: boolean; channel?: string }> {
  const subject = "AI智能体超市 · 密码重置验证码";
  const text = `您的验证码是 ${code}，15 分钟内有效。如非本人操作请忽略。`;
  const html = `
    <div style="font-family:sans-serif;line-height:1.6;color:#111">
      <p>您正在重置 AI智能体超市 账号密码。</p>
      <p style="font-size:28px;letter-spacing:6px;font-weight:700">${code}</p>
      <p>有效期 15 分钟。如非本人操作，请忽略本邮件。</p>
    </div>
  `;
  const result = await sendEmail({ to: email, subject, html, text });
  return { delivered: result.delivered, channel: result.channel };
}
