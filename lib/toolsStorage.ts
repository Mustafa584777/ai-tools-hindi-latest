import { AiTool } from './types';
import { db } from './firebase';
import { collection, deleteDoc, doc, getDocFromServer, getDocs, setDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './storage';

const TOOLS_ADMIN_CACHE_KEY = 'aitoolhindi_admin_tools_cache_v1';

export async function testFirestoreConnection(): Promise<boolean> {
  try {
    if (!db) return false;
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
    return false;
  }
}

export async function fetchAdminTools(): Promise<AiTool[]> {
  let diskTools: AiTool[] = [];
  try {
    const res = await fetch('/api/tools?admin=1', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.tools)) {
        diskTools = data.tools;
      }
    }
  } catch (err) {
    console.warn('Tools disk fetch notice:', err);
  }

  try {
    if (db) {
      const snap = await getDocs(collection(db, 'aiTools'));
      const map = new Map<string, AiTool>();
      for (const tool of diskTools) {
        map.set(tool.slug.toLowerCase(), tool);
      }
      snap.forEach((docSnap) => {
        const d = docSnap.data() as AiTool;
        if (d && d.slug) {
          map.set(d.slug.toLowerCase(), { ...d, id: d.id || docSnap.id });
        }
      });
      const merged = Array.from(map.values()).sort(
        (a, b) => (b.createdAt || 0) - (a.createdAt || 0)
      );
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(TOOLS_ADMIN_CACHE_KEY, JSON.stringify(merged));
        } catch {}
      }
      return merged;
    }
  } catch (error) {
    console.warn('Firestore aiTools read fallback to disk:', error);
  }

  if (diskTools.length > 0) return diskTools;

  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(TOOLS_ADMIN_CACHE_KEY);
      if (cached) return JSON.parse(cached) as AiTool[];
    } catch {}
  }

  return [];
}

export async function saveAdminTool(tool: Partial<AiTool>): Promise<AiTool> {
  const res = await fetch('/api/tools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tool }),
  });

  const data = await res.json();
  if (!res.ok || !data.tool) {
    throw new Error(data.error || 'Failed to save tool');
  }

  const savedTool = data.tool as AiTool;

  // Sync cleanly to Firestore as well (gracefully tolerate un-deployed external rules)
  try {
    if (db) {
      await setDoc(doc(db, 'aiTools', savedTool.id), savedTool);
    }
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.WRITE, `aiTools/${savedTool.id}`);
    } catch (wrapped) {
      console.warn('Firestore aiTools sync notice:', wrapped);
    }
  }

  return savedTool;
}

export async function deleteAdminTool(id: string, slug: string): Promise<void> {
  const res = await fetch(
    `/api/tools?id=${encodeURIComponent(id)}&slug=${encodeURIComponent(slug)}`,
    { method: 'DELETE' }
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to delete tool');
  }

  try {
    if (db) {
      await deleteDoc(doc(db, 'aiTools', id));
    }
  } catch (error) {
    try {
      handleFirestoreError(error, OperationType.DELETE, `aiTools/${id}`);
    } catch (wrapped) {
      console.warn('Firestore aiTools delete notice:', wrapped);
    }
  }
}

export async function syncToolsToFirestore(tools: AiTool[]): Promise<number> {
  if (!db) throw new Error('Firestore DB is not initialized');
  let synced = 0;
  for (const tool of tools) {
    try {
      await setDoc(doc(db, 'aiTools', tool.id), tool);
      synced++;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `aiTools/${tool.id}`);
    }
  }
  return synced;
}

export function downloadToolsJsonFile(tools: AiTool[]) {
  const jsonStr = JSON.stringify(tools, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'tools.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
