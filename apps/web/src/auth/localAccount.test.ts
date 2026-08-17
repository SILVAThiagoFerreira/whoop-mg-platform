import { beforeEach, describe, expect, it } from "vitest";
import {
  createOrVerifyLocalAccount,
  currentLocalAccount,
  setLocalPassword,
} from "./localAccount";

describe("local account security", () => {
  beforeEach(() => localStorage.clear());

  it("creates a hashed local password and rejects the wrong password", async () => {
    const account = await createOrVerifyLocalAccount(
      "athlete@example.com",
      "strong-pass-1",
      true,
    );
    expect(account.passwordHash).toBeTruthy();
    expect(account.passwordHash).not.toContain("strong-pass-1");
    await expect(
      createOrVerifyLocalAccount("athlete@example.com", "wrong-pass", false),
    ).rejects.toThrow("LOCAL_PASSWORD_INVALID");
  });

  it("changes a Google account password without changing its provider", async () => {
    localStorage.setItem(
      "whoop-account-v2",
      JSON.stringify({
        email: "athlete@example.com",
        name: "Athlete",
        provider: "google",
        googleSub: "google-sub",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    const account = await setLocalPassword(
      "athlete@example.com",
      "strong-pass-1",
    );
    expect(account.provider).toBe("google");
    expect(currentLocalAccount()?.passwordHash).toBeTruthy();
  });
});
