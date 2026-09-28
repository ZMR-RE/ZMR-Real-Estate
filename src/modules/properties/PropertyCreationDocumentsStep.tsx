import { useRef } from 'react'
import type { StagedFile } from './usePropertyCreationWizard'

interface PropertyCreationDocumentsStepProps {
  stagedFiles: StagedFile[]
  onAddFiles: (files: FileList) => void
  onRemoveFile: (fileKey: string) => void
  onReattachFile: (fileKey: string, file: File) => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// Package 1 §6 — Documents step (optional). Each staged file is its own
// row: name, size, status, and its own Remove action. A file resumed
// from a reload with no File object yet (uploadStatus stays 'pending'
// with no bytes to send) prompts for re-selection rather than silently
// dropping it or treating the reselection as a sixth file — reattaching
// reuses the same fileKey, so it lands at the same deterministic
// storage path a retry would already be using.
export function PropertyCreationDocumentsStep({ stagedFiles, onAddFiles, onRemoveFile, onReattachFile }: PropertyCreationDocumentsStepProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const reattachInputRef = useRef<HTMLInputElement>(null)
  const reattachTargetRef = useRef<string | null>(null)

  return (
    <div className="property-field-group">
      <h3 className="property-field-group-title">Documents (optional)</h3>
      <div className="field-column">
        <div className="field">
          <label>Deed / acquisition documents</label>
          {stagedFiles.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
              {stagedFiles.map((f) => (
                <div
                  key={f.fileKey}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    padding: 'var(--space-2) var(--space-3)',
                  }}
                >
                  <span style={{ flex: 2 }}>{f.name}</span>
                  <span style={{ flex: 1 }}>{formatSize(f.size)}</span>
                  {f.file ? (
                    <span
                      className={`status-badge ${f.uploadStatus === 'uploaded' ? 'status-badge-success' : f.uploadStatus === 'error' ? 'status-badge-danger' : 'status-badge-neutral'}`}
                      style={{ flex: 1 }}
                    >
                      {f.uploadStatus === 'uploaded' ? 'Uploaded' : f.uploadStatus === 'error' ? 'Failed — will retry on Save' : 'Ready to upload'}
                    </span>
                  ) : (
                    <button
                      type="button"
                      style={{ flex: 1 }}
                      onClick={() => {
                        reattachTargetRef.current = f.fileKey
                        reattachInputRef.current?.click()
                      }}
                    >
                      Re-attach this file
                    </button>
                  )}
                  <button type="button" onClick={() => onRemoveFile(f.fileKey)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) onAddFiles(e.target.files)
              e.target.value = ''
            }}
          />
          <input
            ref={reattachInputRef}
            type="file"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file && reattachTargetRef.current) onReattachFile(reattachTargetRef.current, file)
              e.target.value = ''
            }}
          />
          <button type="button" onClick={() => fileInputRef.current?.click()} style={{ marginTop: 'var(--space-2)' }}>
            Add files
          </button>
          <p className="field-hint">Nothing uploads until Save on the Review step.</p>
        </div>
      </div>
    </div>
  )
}
