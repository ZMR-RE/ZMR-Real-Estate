import { CollapsibleSection } from '../../../shared/CollapsibleSection'
import { documentFilename, formatDocNumber } from './agentNumbering'
import type { Agent, RecordStore } from './agentTypes'

interface AgentIssuersBoxProps {
  agent: Agent
  store: RecordStore
}

// Which entities issue this workload's documents, and each one's own
// independent invoice and receipt sequence (format owner-approved Sep 30).
export function AgentIssuersBox({ agent, store }: AgentIssuersBoxProps) {
  const used = new Set(agent.assignments.map((a) => a.issuerEntityId).filter((id): id is string => id !== null))
  const needsChoice = agent.assignments.filter((a) => a.issuerEntityId === null)
  const example = agent.assignments.find((a) => a.issuerEntityId !== null)

  return (
    <CollapsibleSection title="Issuers & numbering">
      <ul className="agents-assignments">
        {store.entities.filter((e) => used.has(e.id) || needsChoice.length > 0).map((e) => (
          <li key={e.id} className="agents-assignment">
            <span className="agents-assignment-main">
              <span className="agents-assignment-name">{e.legalName}</span>
              <span className="agents-row-meta">
                {e.shortCode
                  ? `Next invoice ${formatDocNumber(e, 'invoice', e.nextInvoiceSeq)} · next receipt ${formatDocNumber(e, 'receipt', e.nextReceiptSeq)}`
                  : 'No short code yet — can’t issue until one is set on the entity profile'}
              </span>
            </span>
            {!used.has(e.id) && <span className="status-badge status-badge-neutral">Co-owner option</span>}
          </li>
        ))}
      </ul>
      {needsChoice.map((a) => (
        <p key={a.id} className="agents-notice-flag">{a.tenantName}: {a.ownerNote}. The issuer is never guessed from ownership.</p>
      ))}
      {example && (
        <p className="field-hint">
          Approved format: {'{CODE}'}-INV-{'{NNNNNN}'} and {'{CODE}'}-RCT-{'{NNNNNN}'}, one continuous sequence per issuer and document type, never reset. Numbers are assigned at issue and never reused; revisions add -R2, -R3. Each entity’s code is set on its profile.
          Example file: {documentFilename('EXH-INV-000009', '2026-11', example.unitLabel)}
        </p>
      )}
    </CollapsibleSection>
  )
}
