const STORAGE_KEY = "whoop-account-v2";

export type LocalAccount = {
  email: string;
  name: string;
  googleSub?: string;
  passwordHash?: string;
  passwordSalt?: string;
  provider: "local" | "google";
  createdAt: string;
  updatedAt: string;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function readAccount(): LocalAccount | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? (JSON.parse(value) as LocalAccount) : null;
  } catch {
    return null;
  }
}

function writeAccount(account: LocalAccount): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(account));
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function hexToBytes(value: string): Uint8Array {
  return new Uint8Array(
    value.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? [],
  );
}

async function digest(password: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const saltBytes = hexToBytes(salt);
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes.buffer.slice(0) as ArrayBuffer,
      iterations: 120_000,
      hash: "SHA-256",
    },
    key,
    256,
  );
  return bytesToHex(new Uint8Array(bits));
}

function randomSalt(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

export function currentLocalAccount(): LocalAccount | null {
  return readAccount();
}

export async function rememberGoogleAccount(user: {
  email: string;
  name?: string;
  sub: string;
}): Promise<LocalAccount> {
  const existing = readAccount();
  const now = new Date().toISOString();
  const account: LocalAccount = {
    email: normalizeEmail(user.email),
    name: user.name?.trim() || user.email.split("@")[0] || "Athlete",
    googleSub: user.sub,
    passwordHash:
      existing?.email === normalizeEmail(user.email)
        ? existing.passwordHash
        : undefined,
    passwordSalt:
      existing?.email === normalizeEmail(user.email)
        ? existing.passwordSalt
        : undefined,
    provider: "google",
    createdAt:
      existing?.email === normalizeEmail(user.email) ? existing.createdAt : now,
    updatedAt: now,
  };
  writeAccount(account);
  return account;
}

export async function createOrVerifyLocalAccount(
  email: string,
  password: string,
  create: boolean,
): Promise<LocalAccount> {
  const normalizedEmail = normalizeEmail(email);
  const existing = readAccount();
  if (existing && existing.email !== normalizedEmail)
    throw new Error("LOCAL_ACCOUNT_MISMATCH");
  if (existing?.passwordHash && existing.passwordSalt) {
    const candidate = await digest(password, existing.passwordSalt);
    if (candidate !== existing.passwordHash)
      throw new Error("LOCAL_PASSWORD_INVALID");
    return existing;
  }
  if (!create) throw new Error("LOCAL_PASSWORD_NOT_SET");
  if (password.length < 8) throw new Error("LOCAL_PASSWORD_TOO_SHORT");
  const now = new Date().toISOString();
  const account: LocalAccount = {
    email: normalizedEmail,
    name: normalizedEmail.split("@")[0] || "Athlete",
    provider: existing?.provider ?? "local",
    googleSub: existing?.googleSub,
    passwordSalt: randomSalt(),
    passwordHash: "",
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  account.passwordHash = await digest(password, account.passwordSalt!);
  writeAccount(account);
  return account;
}

export async function setLocalPassword(
  email: string,
  password: string,
  currentPassword?: string,
): Promise<LocalAccount> {
  const existing = readAccount();
  if (!existing || existing.email !== normalizeEmail(email))
    throw new Error("LOCAL_ACCOUNT_NOT_FOUND");
  if (password.length < 8) throw new Error("LOCAL_PASSWORD_TOO_SHORT");
  if (existing.passwordHash && existing.passwordSalt) {
    if (!currentPassword) throw new Error("CURRENT_PASSWORD_REQUIRED");
    const currentHash = await digest(currentPassword, existing.passwordSalt);
    if (currentHash !== existing.passwordHash)
      throw new Error("CURRENT_PASSWORD_INVALID");
  }
  const account = {
    ...existing,
    passwordSalt: randomSalt(),
    passwordHash: "",
    updatedAt: new Date().toISOString(),
  };
  account.passwordHash = await digest(password, account.passwordSalt);
  writeAccount(account);
  return account;
}

export function clearLocalAccount(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function localAccountError(error: unknown): string {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "LOCAL_PASSWORD_NOT_SET":
      return "Esta conta ainda não tem uma senha local. Use Criar senha para definir uma agora.";
    case "LOCAL_PASSWORD_INVALID":
      return "A senha não confere. Tente novamente ou use o Google.";
    case "LOCAL_PASSWORD_TOO_SHORT":
      return "Use uma senha com pelo menos 8 caracteres.";
    case "CURRENT_PASSWORD_REQUIRED":
      return "Digite sua senha atual para alterá-la.";
    case "CURRENT_PASSWORD_INVALID":
      return "A senha atual não confere.";
    case "LOCAL_ACCOUNT_MISMATCH":
      return "Esta instalação já tem outra conta local. Saia dela antes de entrar com outro email.";
    case "LOCAL_ACCOUNT_NOT_FOUND":
      return "Nenhuma conta local foi encontrada neste navegador.";
    default:
      return "Não foi possível concluir a operação da conta.";
  }
}

// Keep the helper available to tests and future migrations without exposing raw password data.
export { hexToBytes };
