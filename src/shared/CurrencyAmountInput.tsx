import './currencyAmount.css'
import { useEffect, useId, useRef, useState } from 'react'
import { currencyAmountError, formatCurrencyAmount, type CurrencyRules } from './currencyAmount'

interface Props extends CurrencyRules {
  id?: string
  value: string | number
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
}
/** Keep malformed input intact, explain it, and block native form submission. */
export function CurrencyAmountInput({ id, value, onValueChange, required, min, max, disabled, placeholder }: Props) {
  const fallbackId = useId()
  const inputId = id ?? fallbackId
  const ref = useRef<HTMLInputElement>(null)
  const [touched, setTouched] = useState(false)
  const error = currencyAmountError(value, { required, min, max })
  useEffect(() => { ref.current?.setCustomValidity(error ?? '') }, [error])
  return <>
    <input ref={ref} id={inputId} type="text" inputMode="decimal" required={required}
      value={value} disabled={disabled} placeholder={placeholder ?? '0.00'}
      aria-invalid={touched && !!error} aria-describedby={touched && error ? `${inputId}-error` : undefined}
      onChange={event => { event.currentTarget.setCustomValidity(currencyAmountError(event.target.value, {required,min,max}) ?? ''); onValueChange(event.target.value) }}
      onBlur={() => { setTouched(true); if (!error) onValueChange(formatCurrencyAmount(value)) }}
      onInvalid={() => setTouched(true)} />
    {touched && error && <span className="currency-amount-error" id={`${inputId}-error`} role="alert">{error}</span>}
  </>
}
