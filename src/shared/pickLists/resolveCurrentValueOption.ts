// Fixes a real, reported defect: PickListSelect briefly labeled a
// genuinely active value "(archived)" the instant Edit opened, because
// usePickListOptions' activeOptions starts empty (loading=true) for one
// render before its fetch resolves — any non-blank current value looked
// "not found among active options" during that window, active or not.
//
// While loading, a value not yet found among (still-empty) activeOptions
// is shown under its own plain label, not guessed as archived. Only once
// loading has finished and the value is still absent from activeOptions
// is it actually archived — and must still render as the selected option,
// labeled, so an existing record never appears to silently lose its value.
export interface CurrentValueOption {
  value: string
  label: string
}

export function resolveCurrentValueOption(
  value: string,
  activeOptions: { value: string }[],
  loading: boolean,
): CurrentValueOption | null {
  if (value === '') return null
  if (activeOptions.some((o) => o.value === value)) return null
  return { value, label: loading ? value : `${value} (archived)` }
}
