import { useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { useVendors } from '../vendors/useVendors'
import { CaptureForm } from './CaptureForm'
import { CaptureHistoryList } from './CaptureHistoryList'
import { useCaptureHistory } from './useCaptureHistory'
import { DocumentIntakePanel } from '../documentIntake/DocumentIntakePanel'

type InboxTab = 'capture' | 'history'

// History-first intake: the Add action opens existing capture types or Document.
// Receipt validation and accounting behavior remain in the existing form/hook.
export function CaptureInbox() {
  const [tab, setTab] = useState<InboxTab>('history')
  const [documentCapture, setDocumentCapture] = useState(false)
  const { accountId } = useAuth()
  const { vendorOptions, addVendor, refreshVendorOptions } = useVendors(accountId)
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
      <div className="page-header-row"><h1>Quick capture</h1><button type="button" onClick={() => {setDocumentCapture(false);setTab(tab === 'capture' ? 'history' : 'capture')}}>{tab === 'capture' ? 'Back to history' : '+ Add'}</button></div>

      {tab === 'capture' && (documentCapture ? <DocumentIntakePanel key={accountId} capture onCancel={() => setDocumentCapture(false)} onCaptured={() => {setDocumentCapture(false);setTab('history')}}/> : <CaptureForm onCaptured={refresh} onDocumentSelected={() => setDocumentCapture(true)} />)}
      {tab === 'history' && <DocumentIntakePanel key={accountId} />}

      {tab === 'history' && (
        <CaptureHistoryList
          entries={entries}
          accountId={accountId}
          completeFilter={completeFilter}
          onCompleteFilterChange={setCompleteFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          editingId={editingId}
          onStartEditing={startEditing}
          onCancelEditing={cancelEditing}
          processingId={processingId}
          detailsError={detailsError}
          vendorOptions={vendorOptions}
          onCreateVendor={addVendor}
          refreshVendorOptions={refreshVendorOptions}
          onSaveDetails={saveDetails}
          onToggleManuallyCompleted={toggleManuallyCompleted}
          onVoid={voidEntry}
          onViewAttachment={viewAttachment}
        />
      )}
    </div>
  )
}
