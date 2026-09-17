import { CaptureForm } from './CaptureForm'
import { RecentCaptureList } from './RecentCaptureList'
import { useRecentCaptures } from './useRecentCaptures'

// Roadmap 1.5 — "Quick Capture", not the standalone "Mileage log" that
// used to render alongside it (1.6 consolidated Mileage into a capture
// type instead of a separate mechanism).
export function CaptureInbox() {
  const {
    entries,
    completeFilter,
    setCompleteFilter,
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
  } = useRecentCaptures()

  return (
    <>
      <CaptureForm onCaptured={refresh} />
      <RecentCaptureList
        entries={entries}
        completeFilter={completeFilter}
        onCompleteFilterChange={setCompleteFilter}
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
    </>
  )
}
