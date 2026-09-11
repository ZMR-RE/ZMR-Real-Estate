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

  return [
    { title: 'Subcategories', ...subcategory },
    { title: 'Payment methods', ...paymentMethod },
    { title: 'Document types', ...documentType },
    { title: 'Task types', ...taskType },
    { title: 'Unit statuses', ...unitStatus },
    { title: 'Listing platforms', ...listingPlatform },
  ]
}
