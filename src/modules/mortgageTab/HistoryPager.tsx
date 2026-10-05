interface Props { page: number; pageCount: number; rangeLabel: string; noun: string; previous: () => void; next: () => void }
export function HistoryPager({page, pageCount, rangeLabel, noun, previous, next}: Props) {
  return <div className="mortgage-pager"><span aria-live="polite">{rangeLabel} {noun}</span><span><button type="button" onClick={previous} disabled={page===0}>Previous</button><button type="button" onClick={next} disabled={page>=pageCount-1}>Next</button></span></div>
}
