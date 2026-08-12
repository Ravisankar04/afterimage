import {
  DEMO_AFTERIMAGES,
  getDemoById,
  type Afterimage,
} from "@/lib/demo-data";

const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

async function tryFetch<T>(path: string): Promise<T | null> {
  if (!API_URL) return null;
  try {
    const res = await fetch(`${API_URL}${path}`, {
      next: { revalidate: 30 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchAfterimages(): Promise<{
  data: Afterimage[];
  demo: boolean;
}> {
  const remote = await tryFetch<Afterimage[]>("/afterimages");
  if (remote && Array.isArray(remote) && remote.length > 0) {
    return { data: remote, demo: false };
  }
  return { data: DEMO_AFTERIMAGES, demo: true };
}

export async function fetchAfterimage(
  id: string,
): Promise<{ data: Afterimage | null; demo: boolean }> {
  const remote = await tryFetch<Afterimage>(`/afterimages/${id}`);
  if (remote && remote.id) {
    return { data: remote, demo: false };
  }
  const local = getDemoById(id) ?? null;
  return { data: local, demo: true };
}

export async function createAfterimage(
  payload: Partial<Afterimage>,
): Promise<{ ok: boolean; id?: string; demo: boolean }> {
  if (!API_URL) {
    return {
      ok: true,
      id: `demo-${Date.now().toString(36)}`,
      demo: true,
    };
  }
  try {
    const res = await fetch(`${API_URL}/afterimages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      return { ok: false, demo: false };
    }
    const json = (await res.json()) as { id?: string };
    return { ok: true, id: json.id, demo: false };
  } catch {
    return {
      ok: true,
      id: `demo-${Date.now().toString(36)}`,
      demo: true,
    };
  }
}

export function apiBase(): string {
  return API_URL || "(demo mode)";
}
