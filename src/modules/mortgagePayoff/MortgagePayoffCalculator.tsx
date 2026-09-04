import { SearchableSelect } from '../../shared/SearchableSelect'
import { useMortgagePayoff } from './useMortgagePayoff'
import { MortgageDetailsForm } from './MortgageDetailsForm'
import { MortgagePropertySummary } from './MortgagePropertySummary'
import { MortgagePayoffScenarioForm } from './MortgagePayoffScenarioForm'
import { MortgagePayoffResults } from './MortgagePayoffResults'

export function MortgagePayoffCalculator() {
  const {
    propertyOptions,
    propertiesLoading,
    propertyId,
    selectProperty,
    selectedProperty,

    mortgageDetails,
    mortgageLoading,
    isEditingMortgage,
    savingMortgage,
    mortgageError,
    mortgageFormInitialValues,
    startEditingMortgage,
    cancelEditingMortgage,
    saveMortgageDetails,

    equity,

    extraAmount,
    setExtraAmount,
    extraMode,
    setExtraMode,
    scenarioResult,
    scenarioError,
    calculateScenario,
  } = useMortgagePayoff()

  return (
    <div>
      <h1>Mortgage Payoff Scenario Calculator</h1>

      <label htmlFor="property">Property</label>
      {propertiesLoading ? (
        <p>Loading properties…</p>
      ) : (
        <SearchableSelect
          options={propertyOptions}
          value={propertyId}
          onChange={selectProperty}
          placeholder="Search properties…"
        />
      )}

      {!propertyId && <p>Select a property to view or enter its mortgage details.</p>}

      {propertyId && mortgageLoading && <p>Loading mortgage details…</p>}

      {propertyId && !mortgageLoading && mortgageError && <p role="alert">{mortgageError}</p>}

      {propertyId && !mortgageLoading && isEditingMortgage && (
        <MortgageDetailsForm
          key={mortgageDetails?.id ?? 'new'}
          initialValues={mortgageFormInitialValues}
          saving={savingMortgage}
          canCancel={mortgageDetails !== null}
          onSave={saveMortgageDetails}
          onCancel={cancelEditingMortgage}
        />
      )}

      {propertyId && !mortgageLoading && !isEditingMortgage && mortgageDetails && (
        <>
          <MortgagePropertySummary
            mortgageDetails={mortgageDetails}
            marketValue={selectedProperty?.market_value ?? null}
            equity={equity}
            onEdit={startEditingMortgage}
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
      )}
    </div>
  )
}
