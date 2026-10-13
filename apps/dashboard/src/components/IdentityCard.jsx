/**
 * A faithful client-side render of the SVG RWAIDv3 stores on-chain.
 *
 * The markup mirrors `_svgURI()` in contracts/RWAIDv3.sol — same viewBox, same
 * geometry, same caption step-down — so what a client sees before claiming is
 * the artwork that actually lands in their wallet, not an illustration of it.
 */

// Matches _captionSize() in the contract.
function captionSize(name) {
  const len = name.length
  if (len <= 22) return 44
  if (len <= 30) return 34
  if (len <= 42) return 26
  return 20
}

export default function IdentityCard({ name, pending = false }) {
  return (
    <svg
      className={`identity-card${pending ? ' is-pending' : ''}`}
      viewBox="0 0 800 800"
      role="img"
      aria-label={`Identity card for ${name}`}
    >
      <defs>
        <linearGradient id="idcard-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#15171B" />
          <stop offset="1" stopColor="#0B0C0F" />
        </linearGradient>
      </defs>

      <rect width="800" height="800" fill="url(#idcard-bg)" />
      <rect x="40" y="40" width="720" height="720" rx="36" fill="none" stroke="#F4F4F2" strokeOpacity="0.12" />
      <rect x="286" y="196" width="228" height="228" rx="56" fill="#1D4ED8" />

      <text
        x="400" y="352" textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="132" fontWeight="600" fill="#F4F4F2"
      >R</text>

      <text
        x="400" y="536" textAnchor="middle"
        fontFamily="ui-sans-serif, system-ui, Helvetica, Arial"
        fontSize={captionSize(name)} fontWeight="500" fill="#F4F4F2"
      >{name}</text>

      <text
        x="400" y="590" textAnchor="middle"
        fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
        fontSize="22" fill="#F4F4F2" fillOpacity="0.45" letterSpacing="6"
      >RWA&#183;ID</text>
    </svg>
  )
}
