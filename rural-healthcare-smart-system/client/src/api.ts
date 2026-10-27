const API = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API}/api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }
    });
  } catch {
    throw new Error('Cannot connect to the GramCare API. Start the server or check VITE_API_URL.');
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload as T;
}
export type Patient = { id: number; fullName: string; age: number; sex: string; village: string; phone?: string; createdAt: string };
export type Assessment = { id: number; patientId: number; patientName?: string; riskLevel: string; summary: string; flags: string[]; createdAt: string };
export type Facility = { id: number; name: string; type: string; village: string; address: string; phone: string; hours: string; services: string[] };
export type Article = { id: number; title: string; category: string; summary: string; readTime: string };
export type Vital = { id: number; patientId: number; systolic?: number; diastolic?: number; heartRate?: number; temperature?: number; spo2?: number; notes?: string; recordedAt: string };
