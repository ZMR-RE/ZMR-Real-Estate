import { usePickListOptions } from '../../shared/pickLists/usePickListOptions'

// One central place to manage every account-scoped pick-list (roadmap
// 8.1), rather than only being reachable piecemeal from whichever form
// happens to embed a "Manage X" toggle. Each list still uses the same
// usePickListOptions hook the inline toggles use elsewhere — nothing
// about how options are fetched/added/archived is duplicated here.
export function useSettingsPickLists() {
  const subcategory = usePickListOptions('subcategory')
  const paymentMethod = usePickListOptions('payment_method')
  const documentType = usePickListOptions('document_type')
  const taskType = usePickListOptions('task_type')
  const unitStatus = usePickListOptions('unit_status')
  const listingPlatform = usePickListOptions('listing_platform')
  const propertyType = usePickListOptions('property_type')
  const purchaseMethod = usePickListOptions('purchase_method')
  const municipalZoningCode = usePickListOptions('municipal_zoning_code')
  const countyAssessorUseCode = usePickListOptions('county_assessor_use_code')
  const basementType = usePickListOptions('basement_type')
  const streetParking = usePickListOptions('street_parking')
  const contactMethod = usePickListOptions('contact_method')
  const visitType = usePickListOptions('visit_type')
  const paymentHow = usePickListOptions('payment_how')
  const vendorRelationship = usePickListOptions('vendor_relationship')
  const vendorType = usePickListOptions('vendor_type')

  return [
    { title: 'Subcategories', ...subcategory },
    { title: 'Payment methods', ...paymentMethod },
    { title: 'Payment how', ...paymentHow },
    { title: 'Document types', ...documentType },
    { title: 'Task types', ...taskType },
    { title: 'Unit statuses', ...unitStatus },
    { title: 'Listing platforms', ...listingPlatform },
    { title: 'Property types', ...propertyType },
    { title: 'Purchase methods', ...purchaseMethod },
    { title: 'Municipal zoning codes', ...municipalZoningCode },
    { title: 'County assessor use codes', ...countyAssessorUseCode },
    { title: 'Basement types', ...basementType },
    { title: 'Street parking', ...streetParking },
    { title: 'Contact methods', ...contactMethod },
    { title: 'Visit types', ...visitType },
    { title: 'Vendor relationships', ...vendorRelationship },
    { title: 'Vendor types', ...vendorType },
  ]
}
