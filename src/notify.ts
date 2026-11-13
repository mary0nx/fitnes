/**
 * Локальные уведомления. Без сервера push-рассылка невозможна, поэтому напоминание
 * показывается, когда приложение открыто или работает в фоне на устройстве.
 * Для настоящих push по расписанию нужен сервер (Web Push) — контракт заложен в storage/adapter.ts.
 */
export async function requestReminders(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try { return (await Notification.requestPermission()) === 'granted'; } catch { return false; }
}

export async function notify(title: string, body: string, tag = 'wf'): Promise<void> {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const icon = `${import.meta.env.BASE_URL}icons/icon-192.png`;
    if (reg) await reg.showNotification(title, { body, tag, icon, badge: icon });
    else new Notification(title, { body, tag, icon });
  } catch { /* уведомления недоступны — не критично */ }
}

let ctx: AudioContext | null = null;
/** короткий сигнал окончания отдыха */
export function beep(times = 2) {
  try {
    ctx = ctx ?? new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const c = ctx;
    for (let i = 0; i < times; i++) {
      const o = c.createOscillator(), g = c.createGain();
      o.type = 'sine';
      o.frequency.value = i === times - 1 ? 1175 : 880;
      const t0 = c.currentTime + i * 0.22;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
      o.connect(g).connect(c.destination);
      o.start(t0); o.stop(t0 + 0.2);
    }
  } catch { /* звук недоступен */ }
}
export const buzz = (pattern: number | number[] = [120, 80, 120]) => { try { navigator.vibrate?.(pattern); } catch { /* */ } };
