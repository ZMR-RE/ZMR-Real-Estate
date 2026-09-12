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
}

// Roadmap 7.5 — reuses the mortgage_details CRUD + scenario calculator
// wholesale from the former standalone Mortgage Payoff screen; only the
// property-picker was dropped, since this tab is already scoped to one
// property.
export function PropertyProfileMortgageTab({ property }: PropertyProfileMortgageTabProps) {
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
    equity,
    payments,
    loggingPayment,
    paymentError,
    paymentFormInitialValues,
    logPayment,
    escrowTransactions,
    loggingEscrowTransaction,
    escrowTransactionError,
    escrowTransactionFormInitialValues,
    logEscrowTransaction,
    extraAmount,
    setExtraAmount,
    extraMode,
    setExtraMode,
    scenarioResult,
    scenarioError,
    calculateScenario,
  } = useMortgageForProperty(property.id, property.market_value)

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
              marketValue={property.market_value}
              equity={equity}
              onEdit={startEditing}
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

            <h2>Payment history</h2>
            <MortgagePaymentList payments={payments} />
            <MortgagePaymentForm
              initialValues={paymentFormInitialValues}
              saving={loggingPayment}
              error={paymentError}
              onSave={logPayment}
            />

            <h2>Escrow</h2>
            <EscrowTransactionList transactions={escrowTransactions} />
            <EscrowTransactionForm
              initialValues={escrowTransactionFormInitialValues}
              saving={loggingEscrowTransaction}
              error={escrowTransactionError}
              onSave={logEscrowTransaction}
            />
          </>
        )
        // isEditing is forced true above whenever there's no mortgage yet,
        // so mortgageDetails is only null here mid-way through that forced
        // edit — nothing to render until it's saved.
      )}

      {/* Cost basis/depreciation (roadmap 9.15) doesn't depend on a
          mortgage existing at all, so it always renders here regardless
          of the mortgage state above — a free-and-clear property still
          depreciates. */}
      <CostBasisSection propertyId={property.id} purchasePrice={property.purchase_price} />
    </>
  )
}
