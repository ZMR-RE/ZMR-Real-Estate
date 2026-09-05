import { useMortgageForProperty } from '../mortgagePayoff/useMortgageForProperty'
import { MortgageDetailsForm } from '../mortgagePayoff/MortgageDetailsForm'
import { MortgagePropertySummary } from '../mortgagePayoff/MortgagePropertySummary'
import { MortgagePayoffScenarioForm } from '../mortgagePayoff/MortgagePayoffScenarioForm'
import { MortgagePayoffResults } from '../mortgagePayoff/MortgagePayoffResults'
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

  if (isEditing) {
    return (
      <MortgageDetailsForm
        key={mortgageDetails?.id ?? 'new'}
        initialValues={formInitialValues}
        saving={saving}
        canCancel={mortgageDetails !== null}
        onSave={save}
        onCancel={cancelEditing}
      />
    )
  }

  if (!mortgageDetails) {
    return null // isEditing is forced true above whenever there's no mortgage yet
  }

  return (
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
    </>
  )
}
