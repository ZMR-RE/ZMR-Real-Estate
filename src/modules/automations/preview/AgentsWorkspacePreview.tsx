import { AgentDirectory } from './AgentDirectory'
import { AgentProfile } from './AgentProfile'
import { PREVIEW_TODAY, useAgentsPreview, type PreviewDataset } from './useAgentsPreview'

const DATASETS: { id: PreviewDataset; label: string }[] = [
  { id: 'populated', label: 'Example account' },
  { id: 'failed', label: 'Failed run' },
  { id: 'layout', label: 'Many rows (layout test)' },
  { id: 'empty', label: 'New account' },
]

// NON-SAVING PREVIEW screen for Agents: directory on the left, selected
// agent's profile on the right (one pane at a time below 1200px). Nothing
// here reads or writes a database, schedules, connects a mailbox or sends.
export function AgentsWorkspacePreview() {
  const p = useAgentsPreview()

  return (
    <div className="agents-workspace">
      <div className="page-header-row">
        <h1>Agents</h1>
      </div>
      <div className="agents-preview-notice" role="note">
        <strong>Preview.</strong> Fictional data. Nothing is saved, scheduled or sent; reloading resets it.
        <span className="agents-preview-datasets" role="group" aria-label="Preview data">
          {DATASETS.map((d) => (
            <button key={d.id} type="button" aria-pressed={p.dataset === d.id} onClick={() => p.switchDataset(d.id)}>{d.label}</button>
          ))}
        </span>
      </div>

      <div className={`agents-panes agents-panes--show-${p.mobilePane}`}>
        <AgentDirectory
          totalAgents={p.totalAgents}
          page={p.page}
          pageSize={p.pageSize}
          onPageSizeChange={p.setPageSize}
          onPageChange={p.goToPage}
          filters={p.filters}
          onFiltersChange={p.setFilters}
          selectedId={p.selectedAgent?.id ?? null}
          selectedName={p.selectedAgent?.name ?? null}
          selectedPlacement={p.selectedPlacement}
          onShowSelected={p.showSelected}
          onSelect={p.selectAgent}
          store={p.store}
          today={PREVIEW_TODAY}
        />
        {p.selectedAgent ? (
          <AgentProfile key={`${p.dataset}-${p.selectedAgent.id}`} agent={p.selectedAgent} store={p.store} today={PREVIEW_TODAY} actions={p} onBack={p.showDirectory} />
        ) : (
          <section className="agents-profile">
            <p className="empty-state">{p.totalAgents === 0 ? 'Agents you set up will appear here.' : 'Select an agent to see its profile.'}</p>
          </section>
        )}
      </div>
    </div>
  )
}
