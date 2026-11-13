/**
 * Слой хранения. Интерфейс один — реализаций может быть несколько:
 *  • LocalAdapter — localStorage на устройстве (используется сейчас);
 *  • RemoteAdapter — заготовка под синхронизацию с сервером и авторизацию:
 *    достаточно реализовать pull/push и подключить в store/index.ts.
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}

const memory = new Map<string, string>();

/** localStorage с запасным хранением в памяти (приватный режим, запрет cookies). */
export const LocalAdapter: StorageAdapter = {
  getItem(key) {
    try { return localStorage.getItem(key); } catch { return memory.get(key) ?? null; }
  },
  setItem(key, value) {
    try { localStorage.setItem(key, value); } catch { memory.set(key, value); }
  },
  removeItem(key) {
    try { localStorage.removeItem(key); } catch { memory.delete(key); }
  },
};

/** Контракт будущей серверной синхронизации (аккаунт, несколько устройств). */
export interface SyncAdapter {
  /** текущий пользователь или null, если не вошёл */
  user(): Promise<{ id: string; email: string } | null>;
  /** получить снимок данных с сервера */
  pull(): Promise<{ data: string; updatedAt: number } | null>;
  /** отправить снимок данных на сервер */
  push(data: string, updatedAt: number): Promise<void>;
}
