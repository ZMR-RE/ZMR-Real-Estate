import { readFileSync } from 'node:fs'
import { JWT } from 'google-auth-library'

// Server-only. This reads the service account's private key, so it must
// never be imported from src/ — Vite bundles that tree and ships it to
// the browser, which would leak the key to every visitor.
//
// Where this actually runs (Netlify Function vs. Supabase Edge Function)
// is an open question for whichever of roadmap 2.5/2.6/3.2 wires it up
// first. Until then this is just the auth plumbing they'll build on.

const DRIVE_SCOPES = ['https://www.googleapis.com/auth/drive']

const DEFAULT_KEY_PATH = 'credentials/zmr-drive-service-account.json'

interface ServiceAccountKey {
  client_email: string
  private_key: string
}

export function getDriveAuthClient(
  keyPath: string = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ?? DEFAULT_KEY_PATH,
): JWT {
  const key = JSON.parse(readFileSync(keyPath, 'utf-8')) as ServiceAccountKey

  return new JWT({
    email: key.client_email,
    key: key.private_key,
    scopes: DRIVE_SCOPES,
  })
}
