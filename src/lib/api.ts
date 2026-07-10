export interface ApiUser {
  id: number;
  email: string;
}

export type GameResult = 'WIN' | 'TIE' | 'LOSS';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : `Request failed with status ${res.status}`;
    throw new Error(message);
  }

  return data as T;
}

export function fetchCurrentUser(): Promise<{ user: ApiUser | null }> {
  return request('/api/auth/me');
}

export function signUp(email: string, password: string): Promise<{ user: ApiUser }> {
  return request('/api/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signIn(email: string, password: string): Promise<{ user: ApiUser }> {
  return request('/api/auth/signin', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function signOutRequest(): Promise<void> {
  return request('/api/auth/signout', { method: 'POST' });
}

export function recordGameResult(score: number, result: GameResult): Promise<{ ok: true }> {
  return request('/api/scores', {
    method: 'POST',
    body: JSON.stringify({ score, result }),
  });
}

export interface GameScore {
  id: number;
  score: number;
  result: GameResult;
  played_at: string;
}

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function fetchGameScores(
  page = 1,
  pageSize = 10,
): Promise<{ scores: GameScore[]; pagination: Pagination }> {
  return request(`/api/scores?page=${page}&pageSize=${pageSize}`);
}
