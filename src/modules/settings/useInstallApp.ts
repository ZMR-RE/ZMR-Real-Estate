import { useState, useSyncExternalStore } from 'react'
import { getInstallSnapshot, promptInstall, subscribeInstallState } from '../../shared/installPrompt'

function isStandalone() {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIos() {
  if (typeof window === 'undefined') return false
  const ua = window.navigator.userAgent
  const isIphoneOrIpad = /iPad|iPhone|iPod/.test(ua)
  const isIpadOs13Plus = window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1
  return isIphoneOrIpad || isIpadOs13Plus
}

export function useInstallApp() {
  const { canInstall, installed } = useSyncExternalStore(subscribeInstallState, getInstallSnapshot)
  const [installing, setInstalling] = useState(false)
  const [outcome, setOutcome] = useState<'accepted' | 'dismissed' | null>(null)

  const install = async () => {
    setInstalling(true)
    const result = await promptInstall()
    setInstalling(false)
    if (result !== 'unavailable') {
      setOutcome(result)
    }
  }

  return {
    isInstalled: installed || isStandalone(),
    canInstall,
    installing,
    outcome,
    isIos: isIos(),
    install,
  }
}
