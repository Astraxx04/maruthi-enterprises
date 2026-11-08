import type { Enquiry } from "../types";
import { channels, type ChannelResult } from "./channels";

/**
 * Fans the enquiry out to every configured channel. One channel failing never
 * blocks the others, and the customer still gets a success response as long as
 * the enquiry was persisted.
 */
export async function notifyEnquiry(enquiry: Enquiry): Promise<ChannelResult[]> {
  const results = await Promise.all(
    channels.map(async (channel): Promise<ChannelResult> => {
      if (!channel.isConfigured()) return { channel: channel.name, ok: false, skipped: true };
      try {
        await channel.send(enquiry);
        return { channel: channel.name, ok: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[notify] ${channel.name} failed: ${message}`);
        return { channel: channel.name, ok: false, error: message };
      }
    }),
  );
  return results;
}

export { channels } from "./channels";
export type { ChannelResult } from "./channels";
