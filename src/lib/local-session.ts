export const LOCAL_SESSION_COOKIE = 'trapo_local_session';
export const LOCAL_LOGIN_PASSWORD = process.env.NEXT_PUBLIC_LOCAL_LOGIN_PASSWORD ?? 'demo123';

export type LocalSession = {
  userId: string;
  email: string;
  nombre: string;
  rol: string;
  negocioId: string;
  negocioNombre?: string;
};

type StoredLocalSession = LocalSession & {
  expiresAt: number;
};

function serializeSession(session: StoredLocalSession) {
  return encodeURIComponent(JSON.stringify(session));
}

function deserializeSession(value: string | undefined | null) {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as StoredLocalSession;

    if (!parsed.expiresAt || parsed.expiresAt <= Date.now()) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

export function setLocalSession(session: LocalSession, maxAgeSeconds = 60 * 60 * 24 * 7) {
  if (typeof document === 'undefined') {
    return;
  }

  const storedSession: StoredLocalSession = {
    ...session,
    expiresAt: Date.now() + maxAgeSeconds * 1000,
  };

  document.cookie = `${LOCAL_SESSION_COOKIE}=${serializeSession(storedSession)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
}

export function clearLocalSession() {
  if (typeof document === 'undefined') {
    return;
  }

  document.cookie = `${LOCAL_SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getLocalSessionFromDocument() {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith(`${LOCAL_SESSION_COOKIE}=`));

  return deserializeSession(cookie?.split('=')[1] ?? null);
}

export function getLocalSessionFromCookieValue(value: string | undefined) {
  return deserializeSession(value);
}