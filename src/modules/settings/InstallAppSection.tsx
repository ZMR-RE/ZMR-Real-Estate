import { useInstallApp } from './useInstallApp'

// Roadmap 12.5 — installable web app. Android/Chrome gets a real button
// wired to the native beforeinstallprompt flow (shared/installPrompt.ts).
// iOS/Safari has no equivalent API — Apple only allows the user to
// trigger "Add to Home Screen" themselves from the Share sheet — so that
// path is written instructions, never a fake button that looks like it
// does something on iOS.
export function InstallAppSection() {
  const { isInstalled, canInstall, installing, outcome, isIos, install } = useInstallApp()

  return (
    <section>
      <h2>Install app</h2>
      <p>Add ZMR Real Estate to your phone's home screen for quick, app-like access.</p>

      {isInstalled ? (
        <p>Already installed on this device.</p>
      ) : (
        <>
          {canInstall && (
            <div>
              <button type="button" onClick={install} disabled={installing}>
                {installing ? 'Installing…' : 'Install app'}
              </button>
            </div>
          )}

          {outcome === 'dismissed' && (
            <p>
              Install was dismissed. Refresh the page to get the install prompt again, or look for "Install app" in
              the browser's address bar or menu (⋮).
            </p>
          )}

          {!canInstall && !isIos && outcome === null && (
            <p>
              Your browser doesn't support a one-click install prompt. Most Chrome/Android browsers show an
              "Install app" option in the address bar or the browser menu (⋮).
            </p>
          )}

          {isIos && (
            <div>
              <h3>On iPhone/iPad (Safari)</h3>
              <ol>
                <li>Open this site in Safari.</li>
                <li>
                  Tap the Share icon (the square with an arrow pointing up) in the toolbar.
                </li>
                <li>Scroll down and tap "Add to Home Screen."</li>
                <li>Tap "Add" in the top-right corner.</li>
              </ol>
              <p>Apple doesn't allow apps to trigger this automatically — it must be done from Safari's Share menu.</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
