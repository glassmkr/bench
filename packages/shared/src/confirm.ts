import { randomBytes } from "crypto";

interface PendingAction {
  token: string;
  action: string;
  target: string;
  description: string;
  reversible: boolean;
  executor: () => Promise<unknown>;
  expiresAt: number;
}

const pending = new Map<string, PendingAction>();

// Clean expired tokens every minute
setInterval(() => {
  const now = Date.now();
  for (const [token, action] of pending) {
    if (action.expiresAt < now) pending.delete(token);
  }
}, 60_000).unref();

export interface ConfirmationRequest {
  confirmation_required: true;
  action: string;
  target: string;
  description: string;
  reversible: boolean;
  confirm_token: string;
  expires_in_seconds: number;
  message: string;
}

export function requestConfirmation(
  action: string,
  target: string,
  description: string,
  reversible: boolean,
  executor: () => Promise<unknown>,
  ttlSeconds = 300
): ConfirmationRequest {
  const token = randomBytes(24).toString("hex");
  pending.set(token, {
    token,
    action,
    target,
    description,
    reversible,
    executor,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
  return {
    confirmation_required: true,
    action,
    target,
    description,
    reversible,
    confirm_token: token,
    expires_in_seconds: ttlSeconds,
    message: `Confirm by calling the confirm_action tool with token: ${token}`,
  };
}

export async function executeConfirmation(token: string): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const action = pending.get(token);
  if (!action) {
    return { success: false, error: "Invalid or expired confirmation token." };
  }
  if (action.expiresAt < Date.now()) {
    pending.delete(token);
    return { success: false, error: "Confirmation token has expired." };
  }
  pending.delete(token);
  try {
    const result = await action.executor();
    return { success: true, result };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}
