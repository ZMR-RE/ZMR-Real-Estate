import { useMortgageForProperty } from '../mortgagePayoff/useMortgageForProperty'
import { MortgageDetailsForm } from '../mortgagePayoff/MortgageDetailsForm'
import { MortgagePropertySummary } from '../mortgagePayoff/MortgagePropertySummary'
import { MortgagePayoffScenarioForm } from '../mortgagePayoff/MortgagePayoffScenarioForm'
import { MortgagePayoffResults } from '../mortgagePayoff/MortgagePayoffResults'
import { MortgagePaymentForm } from '../mortgagePayoff/MortgagePaymentForm'
import { MortgagePaymentList } from '../mortgagePayoff/MortgagePaymentList'
import { EscrowTransactionForm } from '../mortgagePayoff/EscrowTransactionForm'
import { EscrowTransactionList } from '../mortgagePayoff/EscrowTransactionList'
import { CostBasisSection } from '../depreciation/CostBasisSection'
import type { Property } from './propertiesQueries'

interface PropertyProfileMortgageTabProps {
  property: Property
  marketValue: string | null
}

// Roadmap 7.5 — reuses the mortgage_details CRUD + scenario calculator
// wholesale from the former standalone Mortgage Payoff screen; only the
// property-picker was dropped, since this tab is already scoped to one
// property. marketValue comes from the property_value_logs history
// (roadmap 7.19) rather than a static properties column now — see
// usePropertyProfile's latestMarketValue.
export function PropertyProfileMortgageTab({ property, marketValue }: PropertyProfileMortgageTabProps) {
  const {
    mortgageDetails,
    loading,
    isEditing,
    saving,
    error,
    formInitialValues,
    startEditing,
    cancelEditing,
    save,
    voidMortgage,
    equity,
    payments,
    loggingPayment,
    paymentError,
    paymentFormInitialValues,
    logPayment,
    voidPayment,
    escrowTransactions,
    loggingEscrowTransaction,
    escrowTransactionError,
    escrowTransactionFormInitialValues,
    logEscrowTransaction,
    voidEscrowTransaction,
    extraAmount,
    setExtraAmount,
    extraMode,
    setExtraMode,
    scenarioResult,
    scenarioError,
    calculateScenario,
  } = useMortgageForProperty(property.id, marketValue)

  if (loading) {
    return <p>Loading mortgage details…</p>
  }

  if (error) {
    return <p role="alert">{error}</p>
  }

  return (
    <>
      {isEditing ? (
        <MortgageDetailsForm
          key={mortgageDetails?.id ?? 'new'}
          initialValues={formInitialValues}
          saving={saving}
          canCancel={mortgageDetails !== null}
          onSave={save}
          onCancel={cancelEditing}
        />
      ) : (
        mortgageDetails && (
          <>
            <MortgagePropertySummary
              mortgageDetails={mortgageDetails}
              marketValue={marketValue}
              equity={equity}
              onEdit={startEditing}
              onVoid={voidMortgage}
              voiding={saving}
            />

            <MortgagePayoffScenarioForm
              extraAmount={extraAmount}
              onExtraAmountChange={setExtraAmount}
              extraMode={extraMode}
              onExtraModeChange={setExtraMode}
              error={scenarioError}
              onCalculate={calculateScenario}
            />

            {scenarioResult && <MortgagePayoffResults result={scenarioResult} />}
          </>
        )
        // isEditing is forced true above whenever there's no mortgage yet,
        // so mortgageDetails is only null here mid-way through that forced
        // edit — nothing to render until it's saved.
      )}

      {/* Payment/escrow history (roadmap 9.20) stays visible even after
          the mortgage itself is voided — voiding hides "the" active
          mortgage, not the record of what was already logged against it.
          Only the "log a new one" forms require an active mortgage, since
          the DB triggers behind them do too. */}
      <h2>Payment history</h2>
      <MortgagePaymentList payments={payments} onVoid={voidPayment} voiding={loggingPayment} />
      {mortgageDetails && (
        <MortgagePaymentForm
          initialValues={paymentFormInitialValues}
          saving={loggingPayment}
          error={paymentError}
          onSave={logPayment}
        />
      )}

      <h2>Escrow</h2>
      <EscrowTransactionList
        transactions={escrowTransactions}
        onVoid={voidEscrowTransaction}
        voiding={loggingEscrowTransaction}
      />
      {mortgageDetails && (
        <EscrowTransactionForm
          initialValues={escrowTransactionFormInitialValues}
          saving={loggingEscrowTransaction}
          error={escrowTransactionError}
          onSave={logEscrowTransaction}
        />
      )}

      {/* Cost basis/depreciation (roadmap 9.15) doesn't depend on a
          mortgage existing at all, so it always renders here regardless
          of the mortgage state above — a free-and-clear property still
          depreciates. */}
      <CostBasisSection propertyId={property.id} purchasePrice={property.purchase_price} />
    </>
  )
}
