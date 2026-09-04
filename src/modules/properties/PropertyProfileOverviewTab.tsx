import { useNavigate } from 'react-router-dom'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import type { LlcInput } from '../llcs/llcsQueries'
import { PropertyForm } from './PropertyForm'
import type { Property, PropertyInput } from './propertiesQueries'

interface PropertyProfileOverviewTabProps {
  property: Property
  llcOptions: SearchableSelectOption[]
  onCreateLlc: (input: LlcInput) => Promise<{ id: string } | { error: string }>
  saving: boolean
  onSave: (input: PropertyInput) => void
}

// Reuses the same PropertyForm the Registry's create/edit flow uses — one
// place to edit a property's fields, not a second copy of the form.
export function PropertyProfileOverviewTab({
  property,
  llcOptions,
  onCreateLlc,
  saving,
  onSave,
}: PropertyProfileOverviewTabProps) {
  const navigate = useNavigate()

  return (
    <PropertyForm
      key={property.id}
      initialValues={property}
      llcOptions={llcOptions}
      onCreateLlc={onCreateLlc}
      saving={saving}
      onSave={onSave}
      onCancel={() => navigate('/properties')}
    />
  )
}
