import { useState, type FormEvent } from 'react'
import { PickListSelect } from '../../shared/pickLists/PickListSelect'
import type { AddDocumentLinkInput } from './useDocumentLinks'

interface DocumentLinkFormProps {
  saving: boolean
  onSave: (input: AddDocumentLinkInput) => void
  onCancel: () => void
}

type EntryMode = 'file' | 'link'

export function DocumentLinkForm({ saving, onSave, onCancel }: DocumentLinkFormProps) {
  const [mode, setMode] = useState<EntryMode>('file')
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
      linkUrl: mode === 'link' ? linkUrl.trim() : null,
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <div role="group" aria-label="Entry type">
        <button type="button" aria-pressed={mode === 'file'} onClick={() => setMode('file')}>
          Upload a file
        </button>
        <button type="button" aria-pressed={mode === 'link'} onClick={() => setMode('link')}>
          Paste a link
        </button>
      </div>

      <label htmlFor="document_link_category">Category</label>
      <PickListSelect
        id="document_link_category"
        listName="document_type"
        title="Document types"
        value={category}
        onChange={setCategory}
        required
        placeholder="Select a category"
      />

      <label htmlFor="document_link_label">Label (optional)</label>
      <input
        id="document_link_label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder="e.g. Roof warranty"
      />

      {mode === 'file' ? (
        <>
          <label htmlFor="document_link_file">File</label>
          <input
            id="document_link_file"
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </>
      ) : (
        <>
          <label htmlFor="document_link_url">Link URL</label>
          <input
            id="document_link_url"
            type="url"
            required
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
          />
        </>
      )}

      <button type="submit" disabled={saving || !category}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button type="button" onClick={onCancel} disabled={saving}>
        Cancel
      </button>
    </form>
  )
}
