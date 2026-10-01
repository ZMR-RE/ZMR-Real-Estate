import { InvoiceWorkflowSection } from '../rentInvoices/InvoiceWorkflowSection'
import { useInvoiceWorkflow } from '../rentInvoices/useInvoiceWorkflow'
import { useRentOps } from './useRentOps'
import { InvoiceList } from './InvoiceList'
import { PaymentForm } from './PaymentForm'

export function RentOps() {
  const {
    invoices,
    loading,
    error,
    paymentTargetId,
    saving,
    refresh,
    startRecordingPayment,
    cancelRecordingPayment,
    savePayment,
  } = useRentOps()
  // Drafts, approval and issuance write the same invoice rows this page
  // lists, so the issued list refreshes after each workflow action.
  const workflow = useInvoiceWorkflow(refresh)

  return (
    <div className="rent-ops-page">
      <h1>Rent ops</h1>
      {error && <p role="alert">{error}</p>}

      <InvoiceWorkflowSection workflow={workflow} />

      <h2 className="invoice-section-title">Issued invoices</h2>
      {paymentTargetId && (
        <PaymentForm
          invoiceId={paymentTargetId}
          saving={saving}
          onSave={savePayment}
          onCancel={cancelRecordingPayment}
        />
      )}

      {loading ? (
        <p>Loading…</p>
      ) : (
        <InvoiceList invoices={invoices} onRecordPayment={startRecordingPayment} onOpen={workflow.openInvoice} />
      )}
    </div>
  )
}
