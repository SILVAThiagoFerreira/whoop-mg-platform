export type GoogleUser = {
  sub: string;
  email: string;
  name?: string;
  picture?: string;
};

type TokenResponse = {
  access_token: string;
  expires_in: number;
  scope: string;
  error?: string;
  error_description?: string;
};

type TokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: {
              type?: string;
              message?: string;
            }) => void;
          }) => TokenClient;
          revoke: (token: string, callback?: () => void) => void;
        };
      };
    };
  }
}

// Identity only. Drive/Sheets scopes in a public SPA let a user replay the
// token from DevTools, which is explicitly not part of this product boundary.
export const IDENTITY_SCOPES = "openid profile email";
export const GOOGLE_SCOPES = IDENTITY_SCOPES;

export function googleClientId(): string {
  return (
    (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)?.trim() ?? ""
  );
}

let gisPromise: Promise<void> | undefined;
function loadGoogleIdentityServices(): Promise<void> {
  if (window.google?.accounts.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Não foi possível carregar o login Google."));
    document.head.appendChild(script);
  });
  return gisPromise;
}

export async function requestGoogleAccessToken(): Promise<TokenResponse> {
  const clientId = googleClientId();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID_MISSING");
  await loadGoogleIdentityServices();
  return new Promise((resolve, reject) => {
    const client = window.google?.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_SCOPES,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(
            new Error(
              response.error_description ??
                response.error ??
                "Autorização Google cancelada.",
            ),
          );
          return;
        }
        resolve(response);
      },
      error_callback: (error) =>
        reject(new Error(error.message ?? "Autorização Google cancelada.")),
    });
    if (!client) reject(new Error("Google Identity Services indisponível."));
    else client.requestAccessToken({ prompt: "" });
  });
}

export async function fetchGoogleUser(
  accessToken: string,
): Promise<GoogleUser> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );
  if (!response.ok)
    throw new Error("Não foi possível confirmar a conta Google.");
  return (await response.json()) as GoogleUser;
}

export function revokeGoogleToken(accessToken: string | null): void {
  if (accessToken && window.google?.accounts.oauth2)
    window.google.accounts.oauth2.revoke(accessToken);
}

function desktopCallbackUrl(): string | null {
  const value = new URLSearchParams(window.location.search).get(
    "desktopCallback",
  );
  if (!value) return null;
  try {
    const url = new URL(value);
    if (
      url.protocol !== "http:" ||
      !["127.0.0.1", "localhost"].includes(url.hostname) ||
      !url.port ||
      url.username ||
      url.password
    )
      return null;
    return url.toString();
  } catch {
    return null;
  }
}

export async function sendDesktopAuth(
  accessToken: string,
  user: GoogleUser,
): Promise<boolean> {
  const callback = desktopCallbackUrl();
  if (!callback) return false;
  const response = await fetch(callback, {
    method: "POST",
    mode: "cors",
    keepalive: true,
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify({ accessToken, user }),
  });
  if (!response.ok) throw new Error("O desktop não confirmou o login Google.");
  return true;
}
