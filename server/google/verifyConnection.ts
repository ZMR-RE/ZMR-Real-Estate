import { getDriveAuthClient } from './driveClient.ts'

// Sanity check: confirms the service account key is valid and can
// obtain a Drive-scoped access token. Run with:
//   node server/google/verifyConnection.ts

const client = getDriveAuthClient()
const { token } = await client.getAccessToken()

if (!token) {
  throw new Error('No access token returned — check the service account key.')
}

console.log('Google Drive connection OK — authenticated as', client.email)
