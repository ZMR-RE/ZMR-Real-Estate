const TINT_CLASSES = ['card-tint-1', 'card-tint-2', 'card-tint-3', 'card-tint-4']

// Deterministic per-record card tint: the same id always maps to the same
// one of the 4 soft tints in index.css, so a record's card color doesn't
// shift between renders or reorderings — but which of the 4 it lands on
// isn't meaningful (unlike a status badge), just a visual distinguisher.
export function cardTintClass(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) | 0
  }
  return TINT_CLASSES[Math.abs(hash) % TINT_CLASSES.length]
}
