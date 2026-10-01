import { useState } from 'react'
import { EditableSection } from '../../../shared/EditableSection'
import { ordinalDay } from './agentFormat'
import type { AgentSchedule } from './agentTypes'

interface AgentScheduleBoxProps {
  schedule: AgentSchedule
  onSave: (next: AgentSchedule) => void
}

const DAYS = Array.from({ length: 28 }, (_, i) => i + 1)
const TIME_ZONES = ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles']

// Schedule is configurable but never activatable in the preview: the
// "Run on this schedule" control is shown disabled so the owner can see
// where activation will live without it doing anything.
export function AgentScheduleBox({ schedule, onSave }: AgentScheduleBoxProps) {
  const [draft, setDraft] = useState<AgentSchedule>(schedule)

  const view = (
    <dl className="agents-dl">
      <div>
        <dt>Status</dt>
        <dd>Off — not activated</dd>
      </div>
      <div>
        <dt>Frequency</dt>
        <dd>{schedule.frequency}</dd>
      </div>
      {schedule.draftDayOfMonth !== null && (
        <div>
          <dt>Create drafts on</dt>
          <dd>The {ordinalDay(schedule.draftDayOfMonth)} of each month, for the next month</dd>
        </div>
      )}
      {schedule.timeZone && (
        <div>
          <dt>Time zone</dt>
          <dd>{schedule.timeZone}</dd>
        </div>
      )}
    </dl>
  )

  const edit = (exitEditing: () => void) => (
    <div className="agents-edit">
      <label htmlFor="agent-schedule-day">Create drafts on day</label>
      <select
        id="agent-schedule-day"
        value={draft.draftDayOfMonth ?? ''}
        onChange={(e) => setDraft({ ...draft, draftDayOfMonth: e.target.value ? Number(e.target.value) : null })}
      >
        <option value="">Not set</option>
        {DAYS.map((d) => (
          <option key={d} value={d}>{ordinalDay(d)}</option>
        ))}
      </select>
      <p className="field-hint">Example timing for review. The real draft day and invoice due date are open decisions.</p>
      <label htmlFor="agent-schedule-tz">Time zone</label>
      <select
        id="agent-schedule-tz"
        value={draft.timeZone ?? ''}
        onChange={(e) => setDraft({ ...draft, timeZone: e.target.value || null })}
      >
        <option value="">Not set</option>
        {TIME_ZONES.map((tz) => (
          <option key={tz} value={tz}>{tz}</option>
        ))}
      </select>
      <label className="agents-inline-check">
        <input type="checkbox" checked={false} disabled aria-describedby="agent-schedule-activation-hint" />
        Run on this schedule
      </label>
      <p id="agent-schedule-activation-hint" className="field-hint">Activation isn’t available in this preview.</p>
      <div className="agents-edit-actions">
        <button type="submit" onClick={() => { onSave(draft); exitEditing() }}>Save</button>
        <button type="button" onClick={exitEditing}>Cancel</button>
      </div>
    </div>
  )

  return <EditableSection title="Schedule" defaultOpen view={view} edit={edit} onEditStart={() => setDraft(schedule)} />
}
