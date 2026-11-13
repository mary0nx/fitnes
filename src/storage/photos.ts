/**
 * Приватный фото-дневник: снимки хранятся только на устройстве (IndexedDB),
 * никуда не отправляются и не попадают в экспорт данных.
 */
const DB = 'wf-photos';
const STORE = 'photos';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then((db) => new Promise<T>((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    t.oncomplete = () => db.close();
  }));
}

export const savePhoto = (id: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, id));
export const loadPhoto = (id: string) => tx<Blob | undefined>('readonly', (s) => s.get(id));
export const deletePhoto = (id: string) => tx('readwrite', (s) => s.delete(id));
export const clearPhotos = () => tx('readwrite', (s) => s.clear());

/** Уменьшение снимка перед сохранением (длинная сторона ≤ max), JPEG. */
export async function shrinkImage(file: Blob, max = 1400, quality = 0.85): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality));
}
