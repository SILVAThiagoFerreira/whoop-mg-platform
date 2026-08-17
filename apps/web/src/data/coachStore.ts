import type { GoogleUser } from "../auth/google";

const CHAT_URL =
  (import.meta.env.VITE_WHOOP_CHAT_URL as string | undefined)?.trim() ?? "";

export type CoachMessage = {
  role: "user" | "assistant";
  content: string;
};

type CoachResponse = {
  reply?: string;
  model?: string;
  error?: string;
};

export function isCoachConfigured(): boolean {
  return Boolean(CHAT_URL);
}

export async function askWhoopCoach(
  token: string,
  user: GoogleUser,
  message: string,
  history: CoachMessage[],
): Promise<{ reply: string; model?: string }> {
  if (!CHAT_URL) throw new Error("COACH_API_NOT_CONFIGURED");
  const response = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      history,
      accessToken: token,
      clientSubjectHint: user.sub,
    }),
  });
  const body = (await response.json().catch(() => ({}))) as CoachResponse;
  if (response.status === 401) throw new Error("AUTH_EXPIRED");
  if (!response.ok || !body.reply)
    throw new Error(body.error ?? "WHOOP_COACH_UNAVAILABLE");
  return { reply: body.reply, model: body.model };
}
