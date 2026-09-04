import { useNavigate } from 'react-router-dom'
import { PropertyForm } from './PropertyForm'
import type { Property, PropertyInput } from './propertiesQueries'

interface PropertyProfileOverviewTabProps {
  property: Property
  saving: boolean
  onSave: (input: PropertyInput) => void
}

// Reuses the same PropertyForm the Registry's create/edit flow uses — one
// place to edit a property's fields, not a second copy of the form.
export function PropertyProfileOverviewTab({ property, saving, onSave }: PropertyProfileOverviewTabProps) {
  const navigate = useNavigate()

  return (
    <PropertyForm
      key={property.id}
      initialValues={property}
      saving={saving}
      onSave={onSave}
      onCancel={() => navigate('/properties')}
    />
  )
}
