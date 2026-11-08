import { Resend } from "resend";
import type { Enquiry } from "../types";
import { site } from "../site";
import { htmlEmail, plainText, telegramMessage } from "./format";

export type ChannelResult = { channel: string; ok: boolean; skipped?: boolean; error?: string };
export type Channel = {
  name: string;
  isConfigured(): boolean;
  send(enquiry: Enquiry): Promise<void>;
};

/** Email via Resend — https://resend.com (free tier covers low volume). */
export const resendChannel: Channel = {
  name: "email:resend",
  isConfigured: () => Boolean(process.env.RESEND_API_KEY && process.env.ENQUIRY_TO_EMAIL),
  async send(enquiry) {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const to = process.env.ENQUIRY_TO_EMAIL!.split(",").map((value) => value.trim()).filter(Boolean);
    const { error } = await resend.emails.send({
      from: process.env.ENQUIRY_FROM_EMAIL || "Catalogue <onboarding@resend.dev>",
      to,
      replyTo: enquiry.email,
      subject: `New enquiry — ${enquiry.company_name} (${enquiry.items.length} products)`,
      html: htmlEmail(enquiry),
      text: plainText(enquiry),
    });
    if (error) throw new Error(error.message);
  },
};

/** Telegram Bot API — free, no subscription, one HTTPS call. */
export const telegramChannel: Channel = {
  name: "telegram",
  isConfigured: () => Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
  async send(enquiry) {
    const response = await fetch(
      `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: process.env.TELEGRAM_CHAT_ID,
          text: telegramMessage(enquiry),
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      },
    );
    if (!response.ok) {
      throw new Error(`Telegram responded ${response.status}: ${await response.text()}`);
    }
  },
};

/**
 * Generic webhook — point it at WhatsApp Cloud API, Slack, Zapier or anything
 * else that accepts JSON. Added here so new channels need no code change.
 */
export const webhookChannel: Channel = {
  name: "webhook",
  isConfigured: () => Boolean(process.env.ENQUIRY_WEBHOOK_URL),
  async send(enquiry) {
    const response = await fetch(process.env.ENQUIRY_WEBHOOK_URL!, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.ENQUIRY_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.ENQUIRY_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ business: site.name, enquiry, text: plainText(enquiry) }),
    });
    if (!response.ok) {
      throw new Error(`Webhook responded ${response.status}`);
    }
  },
};

/** Development fallback: print the enquiry so nothing is lost without config. */
export const consoleChannel: Channel = {
  name: "console",
  isConfigured: () => process.env.NODE_ENV !== "production",
  async send(enquiry) {
    console.info(`\n──────── ENQUIRY ────────\n${plainText(enquiry)}\n─────────────────────────\n`);
  },
};

export const channels: Channel[] = [resendChannel, telegramChannel, webhookChannel, consoleChannel];
