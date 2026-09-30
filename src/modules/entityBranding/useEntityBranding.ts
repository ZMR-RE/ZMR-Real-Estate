import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { brandingInputFrom, stationeryFrom } from './brandingMapping'
import { downloadLogo, getBranding, getLogoVersion, listBrandingEntities, saveBranding, uploadLogoVersion, type BrandingEntityRow, type BrandingRow } from './entityBrandingQueries'
import { resolveColors } from './stationeryLogic'
import type { EntityIdentity, Stationery, StationeryLogo } from './stationeryTypes'

const toDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(r.error)
    r.readAsDataURL(blob)
  })

// A logo chosen in the form but not yet stored (uploaded on Save).
export interface PendingLogo extends StationeryLogo {
  file: Blob
}

// Business logic for Settings › Entities › Branding & documents.
export function useEntityBranding(initialEntityId: string | null) {
  const { accountId } = useAuth()
  const [entities, setEntities] = useState<BrandingEntityRow[]>([])
  const [entityId, setEntityId] = useState<string | null>(initialEntityId)
  const [row, setRow] = useState<BrandingRow | null>(null)
  const [logo, setLogo] = useState<StationeryLogo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accountId) return
    listBrandingEntities(accountId).then(({ data }) => {
      setEntities(data ?? [])
      setEntityId((current) => current ?? data?.[0]?.id ?? null)
    })
  }, [accountId])

  const load = useCallback(async (id: string) => {
    setLoading(true)
    const b = await getBranding(id)
    let nextLogo: StationeryLogo | null = null
    if (b.data?.current_logo_id) {
      const v = await getLogoVersion(b.data.current_logo_id)
      const file = v.data ? await downloadLogo(v.data.storage_path) : null
      if (v.data && file?.data) nextLogo = { dataUrl: await toDataUrl(file.data), format: v.data.format, width: v.data.width, height: v.data.height, name: 'Current logo' }
    }
    setRow(b.data ?? null)
    setLogo(nextLogo)
    setError(b.error ? b.error.message : null)
    setLoading(false)
  }, [])

  useEffect(() => {
    if (entityId) load(entityId)
  }, [entityId, load])

  const entity = entities.find((e) => e.id === entityId) ?? null
  const identity: EntityIdentity | null = entity && {
    legalName: entity.name,
    displayName: entity.display_name,
    mailingAddress: entity.mailing_address,
    mailingCity: entity.mailing_city,
    mailingState: entity.mailing_state,
    mailingZip: entity.mailing_zip,
  }

  // Returns true when saved. A new logo is stored first as a permanent
  // version, then selected as current together with the other settings.
  const save = async (next: Stationery, pending: PendingLogo | null): Promise<boolean> => {
    if (!accountId || !entityId) return false
    if (resolveColors(next).warnings.length > 0) {
      setError('Some colours are hard to read — adjust them before saving.')
      return false
    }
    setSaving(true)
    setError(null)
    let logoId = next.logo ? row?.current_logo_id ?? null : null
    if (pending && next.logo) {
      const up = await uploadLogoVersion(accountId, entityId, pending.file, pending.format, pending.width, pending.height)
      if (up.error || !up.data) {
        setSaving(false)
        // Storage refuses a non-owner's upload with a generic policy error.
        setError(
          up.error && /row-level security/i.test(up.error.message)
            ? 'Only the portfolio owner can change branding & documents in this release.'
            : up.error?.message ?? 'The logo couldn’t be stored.',
        )
        return false
      }
      logoId = up.data.id
    }
    const r = await saveBranding(accountId, entityId, row ? row.version : null, brandingInputFrom(next, logoId))
    setSaving(false)
    if (r.error) {
      setError(r.error.code === 'PGRST116' ? 'These settings changed since you opened them. The latest are shown — review and edit again.' : r.error.message)
      await load(entityId)
      return false
    }
    await load(entityId)
    return true
  }

  return {
    entities,
    entityId,
    selectEntity: setEntityId,
    identity,
    stationery: stationeryFrom(row, logo),
    hasSettings: row !== null,
    loading,
    saving,
    error,
    save,
  }
}
