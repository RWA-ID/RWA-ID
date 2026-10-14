/**
 * The 2c "cut-corner tag" mark: an asset tag with its top-right corner clipped,
 * an orange chip in the cut, a punched hole and a name bar. Box is 1 : 0.92.
 * tone="light" sits on paper (ink body), tone="dark" sits on ink (lime body).
 */
export function RwaMark({ size = 30, tone = 'light', style }) {
  return (
    <span className={`mark ${tone}`} style={{ width: size, height: Math.round(size * 0.92), ...style }} aria-hidden="true">
      <span className="m-body" />
      <span className="m-chip" />
      <span className="m-hole" />
      <span className="m-bar" />
    </span>
  )
}

export function Wordmark({ size = 19 }) {
  return <span className="wordmark" style={{ fontSize: size }}>RWA<i />ID</span>
}

export function Lockup({ href = '/', tone = 'light', size = 30, word = 19, onClick }) {
  return (
    <a href={href} onClick={onClick} className="lockup" aria-label="RWA ID — home">
      <RwaMark size={size} tone={tone} />
      <Wordmark size={word} />
    </a>
  )
}
