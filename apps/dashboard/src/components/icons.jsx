// Single stroke-weight icon set, sized 16-grid to match the design handoff.
function Icon({ size = 14, width = 1.5, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
      stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" {...rest}>
      {children}
    </svg>
  )
}

export const ArrowRight  = (p) => <Icon {...p}><path d="M3 8h9.5M9 4.5L12.5 8 9 11.5" /></Icon>
export const ArrowLeft   = (p) => <Icon {...p}><path d="M13 8H3M7 4L3 8l4 4" /></Icon>
export const ChevronRight= (p) => <Icon {...p}><path d="M6 3.5L10.5 8 6 12.5" /></Icon>
export const ChevronUpDown = (p) => <Icon {...p}><path d="M5 6.5L8 3.5l3 3M5 9.5l3 3 3-3" /></Icon>
export const Check       = (p) => <Icon width={1.8} {...p}><path d="M3.5 8.4l3 3L12.5 5" /></Icon>
export const Close       = (p) => <Icon width={1.6} {...p}><path d="M4 4l8 8M12 4l-8 8" /></Icon>
export const Plus        = (p) => <Icon width={1.7} {...p}><path d="M8 3.2v9.6M3.2 8h9.6" /></Icon>
export const Search      = (p) => <Icon {...p}><circle cx="7.2" cy="7.2" r="4.2" /><path d="M10.4 10.4L13.5 13.5" /></Icon>
export const Refresh     = (p) => <Icon {...p}><path d="M2.5 8a5.5 5.5 0 1 0 5.5-5.5" /><path d="M2.5 3v3h3" /></Icon>
export const External    = (p) => <Icon {...p}><path d="M6.5 9.5l7-7M13.5 6.5v-4h-4" /><path d="M12 9.5v3A1.5 1.5 0 0 1 10.5 14H4A1.5 1.5 0 0 1 2.5 12.5V6A1.5 1.5 0 0 1 4 4.5h3" /></Icon>
export const Warning     = (p) => <Icon {...p}><path d="M8 2.5l5.5 10H2.5z" /><path d="M8 6.6v3M8 11.2v.4" /></Icon>
export const Upload      = (p) => <Icon width={1.4} {...p}><path d="M8 11V3M5 6l3-3 3 3" /><path d="M2.5 11.5v1A1.5 1.5 0 0 0 4 14h8a1.5 1.5 0 0 0 1.5-1.5v-1" /></Icon>
export const Grid        = (p) => <Icon width={1.4} {...p}><rect x="2.5" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="9" y="2.5" width="4.5" height="4.5" rx="1" /><rect x="2.5" y="9" width="4.5" height="4.5" rx="1" /><rect x="9" y="9" width="4.5" height="4.5" rx="1" /></Icon>
export const List        = (p) => <Icon width={1.4} {...p}><path d="M2.5 4h11M2.5 8h11M2.5 12h7" /></Icon>
export const Coin        = (p) => <Icon width={1.4} {...p}><circle cx="8" cy="8" r="5.5" /><path d="M8 5.2v5.6M6.3 6.6h3.4M6.3 9.4h3.4" /></Icon>
export const Vault       = (p) => <Icon width={1.4} {...p}><path d="M2 6.2L8 3l6 3.2v6.8H2z" /><path d="M6 13V8.6h4V13" /></Icon>
export const Lock        = (p) => <Icon width={1.4} {...p}><rect x="3" y="7" width="10" height="6.5" rx="1.4" /><path d="M5.4 7V5.2a2.6 2.6 0 0 1 5.2 0V7" /></Icon>
export const Pause       = (p) => <Icon width={1.4} {...p}><rect x="4.2" y="3.5" width="2.4" height="9" rx=".8" /><rect x="9.4" y="3.5" width="2.4" height="9" rx=".8" /></Icon>
export const Person      = (p) => <Icon width={1.4} {...p}><circle cx="8" cy="6" r="2.8" /><path d="M3 13.5a5 5 0 0 1 10 0" /></Icon>
export const Info        = (p) => <Icon width={1.4} {...p}><circle cx="8" cy="8" r="5.8" /><path d="M8 7.4v3.6M8 5.1v.4" /></Icon>
export const Help        = (p) => <Icon width={1.4} {...p}><circle cx="8" cy="8" r="5.8" /><path d="M6.4 6.2A1.7 1.7 0 0 1 9.7 6.8c0 1.2-1.7 1.4-1.7 2.4M8 11.2v.4" /></Icon>
export const Disconnect  = (p) => <Icon width={1.4} {...p}><path d="M6.5 13.5H4A1.5 1.5 0 0 1 2.5 12V4A1.5 1.5 0 0 1 4 2.5h2.5M10 5.5L12.5 8 10 10.5M6 8h6.5" /></Icon>
export const Copy        = (p) => <Icon width={1.4} {...p}><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 5.5V4A1.5 1.5 0 0 0 9 2.5H4A1.5 1.5 0 0 0 2.5 4v5A1.5 1.5 0 0 0 4 10.5h1.5" /></Icon>
export const Bridge      = (p) => <Icon width={1.4} {...p}><path d="M2 8h4M10 8h4" /><path d="M6 5.5L8 8l-2 2.5" /><circle cx="12.6" cy="8" r="1.1" fill="currentColor" stroke="none" /></Icon>
export const Shield      = (p) => <Icon width={1.4} {...p}><path d="M8 2.5l4.5 1.8v4.2c0 2.6-1.9 4.4-4.5 5.2-2.6-.8-4.5-2.6-4.5-5.2V4.3z" /></Icon>

export default Icon
