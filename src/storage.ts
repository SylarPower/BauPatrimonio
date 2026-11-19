import type { Store } from "./model";
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open("baupatrimonio", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("vaults");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function load(key: string): Promise<Store | undefined> {
  const d = await db();
  return new Promise((resolve, reject) => {
    const r = d.transaction("vaults").objectStore("vaults").get(key);
    r.onsuccess = () => {
      resolve(r.result);
      d.close();
    };
    r.onerror = () => reject(r.error);
  });
}
export async function save(key: string, data: Store) {
  const d = await db();
  return new Promise<void>((resolve, reject) => {
    const t = d.transaction("vaults", "readwrite");
    t.objectStore("vaults").put(data, key);
    t.oncomplete = () => {
      d.close();
      resolve();
    };
    t.onerror = () => reject(t.error);
  });
}
export function download(
  name: string,
  content: string,
  type = "application/json",
) {
  const u = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = u;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
