import { useRentOps } from './useRentOps'
import { InvoiceList } from './InvoiceList'
import { InvoiceForm } from './InvoiceForm'
import { PaymentForm } from './PaymentForm'

export function RentOps() {
  const {
    invoices,
    propertyOptions,
    loading,
    error,
    isCreatingInvoice,
    paymentTargetId,
    saving,
    startCreatingInvoice,
    cancelCreatingInvoice,
    saveInvoice,
    startRecordingPayment,
    cancelRecordingPayment,
    savePayment,
  } = useRentOps()

  return (
    <div>
      <h1>Rent Ops</h1>
      {error && <p role="alert">{error}</p>}

      {isCreatingInvoice ? (
        <InvoiceForm
          propertyOptions={propertyOptions}
          saving={saving}
          onSave={saveInvoice}
          onCancel={cancelCreatingInvoice}
        />
      ) : (
        <button type="button" onClick={startCreatingInvoice}>
          New invoice
        </button>
      )}

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
        <InvoiceList invoices={invoices} onRecordPayment={startRecordingPayment} />
      )}
    </div>
  )
}
