import { useRef, useState } from 'react'
import { useAuth } from '../../shared/auth/AuthContext'
import { formatDateOnly } from '../../shared/dateFormat'
import { CATEGORY_LABELS, createTransaction, updateTransaction, type Transaction, type TransactionInput } from './financialsQueries'
import { formatMoney } from './financialsCalculations'
import { blankTransaction, classifySaveError, nextEntryDraft, transactionToInput } from './transactionEntry'

export type EntryMessage = { kind: 'saved' | 'failed' | 'uncertain'; text: string }

type EntrySession =
  | { mode: 'closed' }
  // `seq` remounts the form for each new draft (Save and add another).
  | { mode: 'new'; seq: number; initial: TransactionInput }
  | { mode: 'edit'; transaction: Transaction }

interface UseTransactionEntryOptions {
  propertyLabelFor: (propertyId: string) => string
  onSaved: (saved: { year: number; propertyId: string }) => Promise<string[]>
}

// M2/M3 — one manual entry "session": opening a new or edit form, saving
// (plain Save, or Save and add another for new entries), and the outcome
// message. Property and date carry over only within an add-another chain
// that is still open; closing the form ends the session, so the next
// "Add transaction" starts from normal defaults. Nothing is persisted as
// a preference.
export function useTransactionEntry({ propertyLabelFor, onSaved }: UseTransactionEntryOptions) {
  const { accountId, session } = useAuth()
  const [entry, setEntry] = useState<EntrySession>({ mode: 'closed' })
  const [saving, setSaving] = useState(false)
  // Synchronous double-submit guard: `saving` only disables buttons after
  // a re-render, so a fast second click/Enter could otherwise send twice.
  const savingRef = useRef(false)
  const [message, setMessage] = useState<EntryMessage | null>(null)
  const seqRef = useRef(0)

  const startCreating = () => {
    seqRef.current += 1
    setMessage(null)
    setEntry({ mode: 'new', seq: seqRef.current, initial: blankTransaction() })
  }

  const startEditing = (transaction: Transaction) => {
    setMessage(null)
    setEntry({ mode: 'edit', transaction })
  }

  const close = () => setEntry({ mode: 'closed' })

  const save = async (input: TransactionInput, addAnother: boolean): Promise<boolean> => {
    if (!accountId || !session || savingRef.current || entry.mode === 'closed') return false
    savingRef.current = true
    setSaving(true)
    setMessage(null)
    const { error } =
      entry.mode === 'edit'
        ? await updateTransaction(entry.transaction.id, input)
        : await createTransaction(accountId, session.user.id, input)
    savingRef.current = false
    setSaving(false)

    if (error) {
      // Filters and the draft stay exactly as they were.
      const outcome = classifySaveError(error)
      setMessage({ kind: outcome.kind, text: outcome.message })
      return false
    }

    const year = Number(input.transactionDate.slice(0, 4))
    const moved = await onSaved({ year, propertyId: input.propertyId })
    const what = `${formatDateOnly(input.transactionDate)} · ${propertyLabelFor(input.propertyId)} · ${CATEGORY_LABELS[input.category]} · ${formatMoney(input.amount)}`
    const verb = entry.mode === 'edit' ? 'Saved changes' : 'Saved'
    setMessage({ kind: 'saved', text: `${verb}: ${what}${moved.length > 0 ? ` (${moved.join(', ')})` : ''}.` })

    if (addAnother && entry.mode === 'new') {
      seqRef.current += 1
      setEntry({ mode: 'new', seq: seqRef.current, initial: nextEntryDraft(input) })
    } else {
      setEntry({ mode: 'closed' })
    }
    return true
  }

  return {
    entry,
    formKey: entry.mode === 'edit' ? `edit-${entry.transaction.id}` : entry.mode === 'new' ? `new-${entry.seq}` : 'closed',
    initialValues: entry.mode === 'edit' ? transactionToInput(entry.transaction) : entry.mode === 'new' ? entry.initial : null,
    saving,
    message,
    dismissMessage: () => setMessage(null),
    startCreating,
    startEditing,
    close,
    save,
  }
}
