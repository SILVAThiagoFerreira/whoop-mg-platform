import { useCallback, useState } from "react";
import {
  fetchGoogleUser,
  googleClientId,
  requestGoogleAccessToken,
  revokeGoogleToken,
  type GoogleUser,
} from "./google";

type AuthStatus = "signed_out" | "loading" | "signed_in" | "error";
export type GoogleAuthState = {
  status: AuthStatus;
  user: GoogleUser | null;
  accessToken: string | null;
  error: string | null;
  configured: boolean;
};

export function useGoogleAuth() {
  const [state, setState] = useState<GoogleAuthState>({
    status: "signed_out",
    user: null,
    accessToken: null,
    error: null,
    configured: Boolean(googleClientId()),
  });
  const signIn = useCallback(async () => {
    setState((current) => ({ ...current, status: "loading", error: null }));
    try {
      const token = await requestGoogleAccessToken();
      const user = await fetchGoogleUser(token.access_token);
      setState({
        status: "signed_in",
        user,
        accessToken: token.access_token,
        error: null,
        configured: true,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Não foi possível entrar.";
      setState((current) => ({ ...current, status: "error", error: message }));
    }
  }, []);
  const signOut = useCallback(() => {
    revokeGoogleToken(state.accessToken);
    setState({
      status: "signed_out",
      user: null,
      accessToken: null,
      error: null,
      configured: Boolean(googleClientId()),
    });
  }, [state.accessToken]);
  return { ...state, signIn, signOut };
}
