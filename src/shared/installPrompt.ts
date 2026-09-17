// Roadmap 12.5 — captures the browser's native "beforeinstallprompt"
// event at module load time (before any component mounts), since the
// event fires once per page load and is lost if nothing is listening
// yet. Chrome/Android only; Safari/iOS never fires this event, so
// InstallAppSection falls back to written instructions there instead.

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()

// useSyncExternalStore requires getSnapshot to return a referentially
// stable value when nothing has changed, or it re-renders forever. Cache
// the snapshot object and only replace it when the underlying state
// actually changes (inside notify()).
let snapshot = { canInstall: false, installed: false }

function notify() {
  snapshot = { canInstall: deferredPrompt !== null, installed }
  listeners.forEach((listener) => listener())
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    deferredPrompt = event as BeforeInstallPromptEvent
    notify()
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    installed = true
    notify()
  })
}

export function getInstallSnapshot() {
  return snapshot
}

export function subscribeInstallState(callback: () => void) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt) {
    return 'unavailable'
  }
  const event = deferredPrompt
  deferredPrompt = null
  notify()
  await event.prompt()
  const choice = await event.userChoice
  return choice.outcome
}
