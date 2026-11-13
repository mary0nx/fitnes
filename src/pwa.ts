import { useSyncExternalStore } from 'react';

/** Установка на главный экран (Android/desktop Chrome — через beforeinstallprompt). */
interface InstallEvent extends Event { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
let deferred: InstallEvent | null = null;
const subs = new Set<() => void>();

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e as InstallEvent;
  subs.forEach((f) => f());
});
window.addEventListener('appinstalled', () => { deferred = null; subs.forEach((f) => f()); });

export const canInstall = () => !!deferred;
export const useInstallAvailable = () => useSyncExternalStore((cb) => { subs.add(cb); return () => subs.delete(cb); }, canInstall);
export async function promptInstall(): Promise<boolean> {
  if (!deferred) return false;
  await deferred.prompt();
  const r = await deferred.userChoice;
  deferred = null;
  subs.forEach((f) => f());
  return r.outcome === 'accepted';
}
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
