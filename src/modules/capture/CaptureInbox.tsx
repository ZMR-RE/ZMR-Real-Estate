import { useState } from 'react'
import { CaptureForm } from './CaptureForm'
import { CaptureHistoryList } from './CaptureHistoryList'
import { useCaptureHistory } from './useCaptureHistory'

type InboxTab = 'capture' | 'history'

const TABS: { key: InboxTab; label: string }[] = [
  { key: 'capture', label: 'Capture' },
  { key: 'history', label: 'History' },
]

// Roadmap 1.5/1.14 — "Quick capture", split into Capture/History tabs so
// the entry form and the logged-entries table each get the full screen
// instead of a long vertical scroll to reach either one.
export function CaptureInbox() {
  const [tab, setTab] = useState<InboxTab>('capture')
  const {
    entries,
    completeFilter,
    setCompleteFilter,
    typeFilter,
    setTypeFilter,
    editingId,
    startEditing,
    cancelEditing,
    processingId,
    detailsError,
    saveDetails,
    toggleManuallyCompleted,
    voidEntry,
    viewAttachment,
    refresh,
  } = useCaptureHistory()

  return (
    <div>
      <h1>Quick capture</h1>

      <div className="tab-bar" role="tablist">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'capture' && <CaptureForm onCaptured={refresh} />}

      {tab === 'history' && (
        <CaptureHistoryList
          entries={entries}
          completeFilter={completeFilter}
          onCompleteFilterChange={setCompleteFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          editingId={editingId}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          processingId={processingId}
          detailsError={detailsError}
          onSaveDetails={saveDetails}
          onToggleManuallyCompleted={toggleManuallyCompleted}
          onVoid={voidEntry}
          onViewAttachment={viewAttachment}
        />
      )}
    </div>
  )
}
