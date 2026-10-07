import { useId, useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { AddDocumentLinkInput } from './useDocumentLinks'

interface DocumentLinkFormProps {
  kind?: 'file' | 'link'
  saving: boolean
  onSave: (input: AddDocumentLinkInput) => void
  onCancel: () => void
}

type EntryMode = 'file' | 'link' | 'drive'

export function DocumentLinkForm({ kind, saving, onSave, onCancel }: DocumentLinkFormProps) {
  const id = useId()
  const [mode, setMode] = useState<EntryMode>(kind==='link'?'link':'file')
  const [category, setCategory] = useState('')
  const [label, setLabel] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [linkUrl, setLinkUrl] = useState('')

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    onSave({
      category,
      label: label.trim() || null,
      file: mode === 'file' ? file : null,
      linkUrl: mode !== 'file' ? linkUrl.trim() : null,
      linkType: mode === 'drive' ? 'drive_folder' : null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <fieldset disabled={saving}>
      {kind!=='file' && <div role="group" aria-label="Entry type">
        {!kind && <button type="button" aria-pressed={mode === 'file'} onClick={() => setMode('file')}>
          Upload a file
        </button>}
        <button type="button" aria-pressed={mode === 'link'} onClick={() => setMode('link')}>
          Paste a link
        </button>
        <button type="button" aria-pressed={mode === 'drive'} onClick={() => setMode('drive')}>
          Google Drive folder
        </button>
      </div>}

      <label htmlFor={`${id}-category`}>
        Category<span className="required-marker">*</span>
      </label>
      <PickListSelect
        id={`${id}-category`}
        listName="document_type"
        title="Document types"
        value={category}
        onChange={setCategory}
        required
        placeholder="Select a category"
      />

      <label htmlFor={`${id}-label`}>Label</label>
      <input
        id={`${id}-label`}
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Roof warranty"
      />

      {mode === 'file' ? (
        <>
          <label htmlFor={`${id}-file`}>
            File<span className="required-marker">*</span>
          </label>
          <input
            id={`${id}-file`}
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </>
      ) : (
        <>
          <label htmlFor={`${id}-url`}>
            {mode === 'drive' ? 'Google Drive folder URL' : 'Link URL'}
            <span className="required-marker">*</span>
          </label>
          <input
            id={`${id}-url`}
            type="url"
            required
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder={mode === 'drive' ? 'https://drive.google.com/drive/folders/…' : 'https://…'}
          />
        </>
      )}

      <div className="document-library-actions">
      <button type="submit" disabled={saving || !category}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
      </div>
      </fieldset>
    </form>
  )
}
