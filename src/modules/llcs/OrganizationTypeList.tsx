import { Fragment, useState } from 'react'
import type { SearchableSelectOption } from '../../shared/SearchableSelect'
import type { HoldingCompanyInput } from '../holdingCompanies/holdingCompaniesQueries'
import { LlcForm } from './LlcForm'
import { OrganizationTypePropertiesPanel } from './OrganizationTypePropertiesPanel'
import type { Llc, LlcInput } from './llcsQueries'

interface OrganizationTypeListProps {
  accountId: string | null
  llcs: Llc[]
  llcOptions: SearchableSelectOption[]
  editingId: string | null
  saving: boolean
  error: string | null
  holdingCompanyOptions: SearchableSelectOption[]
  onCreateHoldingCompany: (input: HoldingCompanyInput) => Promise<{ id: string } | { error: string }>
  onStartEditing: (id: string) => void
  onSave: (id: string, input: LlcInput) => void
  onCancel: () => void
  onToggleArchived: (llc: Llc) => void
}

export function OrganizationTypeList({
  accountId,
  llcs,
  llcOptions,
  editingId,
  saving,
  error,
  holdingCompanyOptions,
  onCreateHoldingCompany,
  onStartEditing,
  onSave,
  onCancel,
  onToggleArchived,
}: OrganizationTypeListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (llcs.length === 0) {
    return <p className="empty-state">No Organization types yet.</p>
  }

  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Holding company</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {llcs.map((llc) =>
            editingId === llc.id ? (
              <tr key={llc.id}>
                <td colSpan={4}>
                  <LlcForm
                    initialValues={{
                      name: llc.name,
                      ein: llc.ein,
                      formation_state: llc.formation_state,
                      registered_agent: llc.registered_agent,
                      formation_date: llc.formation_date,
                      annual_report_due_date: llc.annual_report_due_date,
                      holding_company_id: llc.holding_company_id,
                    }}
                    saving={saving}
                    error={error}
                    holdingCompanyOptions={holdingCompanyOptions}
                    onCreateHoldingCompany={onCreateHoldingCompany}
                    onSave={(input) => onSave(llc.id, input)}
                    onCancel={onCancel}
                  />
                </td>
              </tr>
            ) : (
              <Fragment key={llc.id}>
                <tr className={llc.archived ? 'row-voided' : ''}>
                  <td>{llc.name}</td>
                  <td>{llc.holding_company?.name ?? '—'}</td>
                  <td>
                    <span className={`status-badge ${llc.archived ? 'status-badge-neutral' : 'status-badge-success'}`}>
                      {llc.archived ? 'Archived' : 'Active'}
                    </span>
                  </td>
                  <td>
                    <button type="button" onClick={() => onStartEditing(llc.id)}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onToggleArchived(llc)}>
                      {llc.archived ? 'Restore' : 'Archive'}
                    </button>
                    <button type="button" onClick={() => setExpandedId(expandedId === llc.id ? null : llc.id)}>
                      {expandedId === llc.id ? 'Hide properties' : 'View properties'}
                    </button>
                  </td>
                </tr>
                {expandedId === llc.id && (
                  <tr>
                    <td colSpan={4}>
                      <OrganizationTypePropertiesPanel accountId={accountId} llcId={llc.id} llcOptions={llcOptions} />
                    </td>
                  </tr>
                )}
              </Fragment>
            ),
          )}
        </tbody>
      </table>
    </div>
  )
}
