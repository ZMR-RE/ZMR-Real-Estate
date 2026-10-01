import { Fragment, useState } from 'react'
import { formatRunTime } from './agentFormat'
import type { AgentRun, RunOutcome } from './agentTypes'

interface AgentRunsTabProps {
  runs: AgentRun[]
}

const OUTCOME_LABEL: Record<RunOutcome, string> = {
  completed: 'Completed',
  completed_with_blocks: 'Completed, some skipped',
  failed: 'Failed',
}
// Ordinary completion is neutral; skipped tenants need review; failure is red.
const OUTCOME_BADGE: Record<RunOutcome, string> = {
  completed: 'status-badge-neutral',
  completed_with_blocks: 'status-badge-warning',
  failed: 'status-badge-danger',
}

export function AgentRunsTab({ runs }: AgentRunsTabProps) {
  const [openId, setOpenId] = useState<string | null>(runs[0]?.id ?? null)

  if (runs.length === 0) return <p className="empty-state">No runs yet.</p>

  return (
    <div className="table-scroll">
      <table className="agents-table">
        <thead>
          <tr>
            <th scope="col">Started</th>
            <th scope="col">Type</th>
            <th scope="col">Result</th>
            <th scope="col">Drafts</th>
            <th scope="col">Skipped</th>
          </tr>
        </thead>
        <tbody>
          {runs.map((run) => {
            const open = openId === run.id
            return (
              <Fragment key={run.id}>
                <tr className={open ? 'agents-table-row agents-table-row--open' : 'agents-table-row'}>
                  <td>
                    <button
                      type="button"
                      className="agents-link-button"
                      aria-expanded={open}
                      aria-controls={`run-notes-${run.id}`}
                      onClick={() => setOpenId(open ? null : run.id)}
                    >
                      {formatRunTime(run.startedAt)}
                    </button>
                  </td>
                  <td>{run.kind}</td>
                  <td>
                    <span className={`status-badge ${OUTCOME_BADGE[run.outcome]}`}>{OUTCOME_LABEL[run.outcome]}</span>
                  </td>
                  <td>{run.draftsCreated}</td>
                  <td>{run.blocked}</td>
                </tr>
                {open && (
                  <tr id={`run-notes-${run.id}`} className="agents-table-detail">
                    <td colSpan={5}>
                      <ul className="agents-reasons">
                        {run.notes.map((note) => (
                          <li key={note}>{note}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
