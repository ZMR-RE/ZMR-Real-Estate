import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import { NO_LLC_ID } from './useLlcs'
import { useOrganizationTypeProperties } from './useOrganizationTypeProperties'

interface OrganizationTypePropertiesPanelProps {
  accountId: string | null
  llcId: string
  llcOptions: SearchableSelectOption[]
}

// Roadmap 8.2c — shown inline under an expanded Organization type row:
// every property currently assigned to it, each with its own reassign
// picker (the same llcOptions used everywhere else a property picks its
// Organization type, so "Individual ownership" and every other entity
// are all valid reassignment targets).
export function OrganizationTypePropertiesPanel({ accountId, llcId, llcOptions }: OrganizationTypePropertiesPanelProps) {
  const { properties, loading, error, reassigningId, reassign } = useOrganizationTypeProperties(accountId, llcId)

  if (loading) {
    return <p>Loading…</p>
  }

  return (
    <div>
      {error && <p role="alert">{error}</p>}
      {properties.length === 0 ? (
        <p className="empty-state">No properties currently assigned to this Organization type.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Property</th>
              <th>Reassign to</th>
            </tr>
          </thead>
          <tbody>
            {properties.map((property) => (
              <tr key={property.id}>
                <td>{property.address ?? property.name}</td>
                <td>
                  {reassigningId === property.id ? (
                    'Saving…'
                  ) : (
                    <select
                      value=""
                      disabled={reassigningId !== null}
                      onChange={(e) => {
                        const id = e.target.value
                        if (id) reassign(property.id, id === NO_LLC_ID ? null : id)
                      }}
                    >
                      <option value="">Choose a new Organization type…</option>
                      {llcOptions
                        .filter((o) => o.id !== llcId)
                        .map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
