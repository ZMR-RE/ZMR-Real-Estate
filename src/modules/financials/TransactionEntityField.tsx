import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { SearchableSelect } from '../../shared/SearchableSelect'
import { formatDateOnly } from '../../shared/dateFormat'
import { listEntityOptions, suggestTransactionEntity, type EntityOption } from './transactionEntityQueries'
import { canSuggest, entityPickerOptions, showSuggestion, suggestionFromLookup, type EntitySuggestion } from './transactionEntity'

interface TransactionEntityFieldProps {
  propertyId: string
  transactionDate: string
  value: string | null
  onChange: (entityId: string | null) => void
}

// The entity whose books carry this transaction. Optional: left blank, the
// transaction stays in the portfolio and property totals and is listed
// under "Needs entity". The property's sole owner on the date is offered
// as a suggestion the owner must accept — it is never filled in for them.
export function TransactionEntityField({ propertyId, transactionDate, value, onChange }: TransactionEntityFieldProps) {
  const { accountId } = useAuth()
  const [options, setOptions] = useState<EntityOption[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  // The last lookup and which property/date it was for. A lookup for an
  // earlier property/date is never shown for the current one.
  const [lookup, setLookup] = useState<{ key: string; suggestion: EntitySuggestion } | null>(null)

  const loadOptions = useCallback(async (): Promise<EntityOption[]> => {
    if (!accountId) return []
    const { data, error } = await listEntityOptions(accountId)
    if (error) {
      setLoadError(`Couldn't load entities: ${error.message}`)
      return []
    }
    setLoadError(null)
    setOptions(data ?? [])
    return data ?? []
  }, [accountId])

  const ready = canSuggest(propertyId, transactionDate)
  const key = `${propertyId}|${transactionDate}`

  // Look the suggestion up (with a fresh entity list) whenever the
  // property or date changes; a slower answer for an earlier one is ignored.
  useEffect(() => {
    let current = true
    const lookUp = ready ? suggestTransactionEntity(propertyId, transactionDate) : Promise.resolve(null)
    const entities = accountId ? listEntityOptions(accountId) : Promise.resolve(null)
    Promise.all([lookUp, entities]).then(([result, loaded]) => {
      if (!current) return
      if (loaded) {
        setLoadError(loaded.error ? `Couldn't load entities: ${loaded.error.message}` : null)
        if (!loaded.error) setOptions(loaded.data ?? [])
      }
      if (!result) return
      setLookup({
        key,
        suggestion: result.error
          ? { kind: 'failed', message: result.error.message }
          : suggestionFromLookup(result.data, loaded?.data ?? []),
      })
    })
    return () => {
      current = false
    }
  }, [ready, key, propertyId, transactionDate, accountId])

  const suggestion: EntitySuggestion = !ready ? { kind: 'none' } : lookup?.key === key ? lookup.suggestion : { kind: 'loading' }

  const date = canSuggest(propertyId, transactionDate) ? formatDateOnly(transactionDate) : ''

  return (
    <>
      <label id="responsible_entity_label">Entity (whose books)</label>
      <div id="responsible_entity" aria-labelledby="responsible_entity_label">
        <SearchableSelect
          options={entityPickerOptions(options, value)}
          value={value}
          onChange={(id) => onChange(id)}
          onOpen={loadOptions}
          placeholder="Not assigned yet"
        />
        {value && (
          <button type="button" onClick={() => onChange(null)}>
            Clear
          </button>
        )}
      </div>
      {loadError && <p className="field-error">{loadError}</p>}
      {showSuggestion(suggestion, value) && suggestion.kind === 'suggested' && (
        <p className="field-hint">
          Suggested: <strong>{suggestion.entityName}</strong>, the property's only recorded owner on {date}.{' '}
          <button type="button" onClick={() => onChange(suggestion.entityId)}>
            Use {suggestion.entityName}
          </button>
        </p>
      )}
      {!value && suggestion.kind === 'unresolved' && (
        <p className="field-hint">
          No suggestion: this property's ownership on {date} is shared or not fully recorded. Choose the entity, or leave it
          blank and it will be listed under Needs entity.
        </p>
      )}
      {suggestion.kind === 'failed' && <p className="field-hint">Couldn't check the property's owner: {suggestion.message}</p>}
    </>
  )
}
