# RWA-ID Design Guidelines

## Design Approach: Web3 Trust & Clarity

**Selected Approach:** Hybrid - Drawing from leading Web3 platforms (Coinbase, Uniswap) + Material Design principles for clarity and feedback

**Key Principles:**
- Trust through transparency: Clear transaction states and blockchain confirmations
- Minimal friction: Reduce cognitive load in wallet connections and claiming flows
- Professional credibility: Clean, structured layouts that instill confidence
- Action-oriented: Guide users decisively through each step

## Typography

**Font Stack:**
- Primary: Inter (Google Fonts) - body text, UI elements
- Accent: Space Grotesk (Google Fonts) - headings, emphasized elements

**Hierarchy:**
- Hero Heading: text-5xl/text-6xl, font-bold, Space Grotesk
- Section Headings: text-3xl/text-4xl, font-semibold, Space Grotesk
- Subsection: text-xl/text-2xl, font-medium
- Body: text-base/text-lg, font-normal, Inter
- Labels/Captions: text-sm, font-medium
- Code/Technical (addresses, hashes): font-mono, text-sm

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16, 24
- Tight spacing: p-2, gap-2 (compact UI elements)
- Standard spacing: p-4, gap-4, mb-6 (forms, cards)
- Section spacing: py-12, py-16, py-24 (vertical rhythm)
- Large gaps: gap-8, gap-12 (card grids, wizard steps)

**Container Structure:**
- Max widths: max-w-4xl (forms/wizards), max-w-6xl (landing content), max-w-7xl (full sections)
- Padding: px-4 (mobile), px-6 (tablet), px-8 (desktop)

## Component Library

### Landing Page (/)
**Hero Section:**
- Layout: Full-width with max-w-6xl centered content
- Height: min-h-screen with content vertically centered
- Structure: Two-column on desktop (60/40 split) - Text left, Visual right
- Image: Abstract blockchain/network visualization or platform dashboard preview (900x600px), subtle floating effect
- CTA: Two-button layout - "Launch Platform" (primary) + "Claim Identity" (secondary ghost)

**Content Sections:**
1. **For Platforms** - 3-column feature grid (icons + title + description): "Create Namespace", "Upload Allowlist", "Deploy at Scale"
2. **For Users** - 2-column layout with claim flow visualization + benefit list
3. **How It Works** - Accordion with 3-4 expandable panels, technical details collapsed by default
4. **Trust Indicators** - Single row: Chain logo, Contract address (truncated with copy), "Supports millions of claims"

### Platform Dashboard (/platform)
**Wizard Layout:**
- Progress indicator: Horizontal stepper showing 5 steps (numbered circles with connecting lines)
- Card-based: Each step in elevated card (shadow-lg), max-w-2xl centered
- Navigation: "Back" + "Continue" buttons at card bottom, "Continue" disabled until step valid

**Step-Specific Components:**
1. **Connect Wallet:** Large wallet button (MetaMask icon + text), network badge showing "Linea Mainnet"
2. **Create Project:** Three-field vertical form, soulbound toggle with helper text, fee display in highlighted box
3. **Upload CSV:** Drag-drop zone (dashed border, cloud upload icon), example CSV download link, parsing result box showing merkleRoot + count in mono font
4. **Set Root:** Summary card showing projectId + merkleRoot, single confirm button, transaction status panel
5. **Complete:** Success state with confetti-style celebration, claim link in copy-able box, "Create Another Project" secondary action

### Claim Page (/claim)
**Layout:** Single-column, max-w-lg centered
**Components:**
- Header: Project slug display (large, Space Grotesk), "Claim your RWA-ID" subheading
- Input: Name field with ".{slug}.rwa-id.eth" suffix displayed inline
- Connect wallet button (if not connected)
- Eligibility check: Loading state → Success (green checkmark, "You're eligible!") or Error (red X, "Not on allowlist")
- Claim button: Full-width, prominent, disabled until eligible
- Result: Transaction hash link, resolved name display in success card

## Visual Elements

**Cards:**
- Background: Subtle elevated surface
- Border radius: rounded-xl
- Padding: p-6 or p-8
- Shadow: shadow-md (resting), shadow-xl (interactive)

**Buttons:**
- Primary: Full roundedness (rounded-full), px-6 py-3, font-semibold
- Secondary: Outlined variant, same sizing
- Icon buttons: Square with rounded-lg, p-3

**Status Indicators:**
- Success: Green accent with checkmark icon
- Error: Red accent with X icon  
- Loading: Animated spinner, pulsing skeleton for data loads
- Transaction: Link with external icon, mono font for hash

**Form Inputs:**
- Height: h-12
- Padding: px-4
- Border: Focused ring with primary accent
- Labels: mb-2, text-sm, font-medium

## Images

**Landing Hero Image:**
- Placement: Right column of hero section (desktop), below text (mobile)
- Style: Modern abstract visualization representing blockchain network or identity registry concept
- Dimensions: 900x600px minimum
- Treatment: Subtle glow/gradient overlay to maintain text contrast if buttons overlay

**Platform Wizard:**
- No images - focus on clarity and completion speed
- Use iconography (Heroicons) for step indicators and status

**Claim Page:**
- Small brand/project icon next to slug (64x64px)
- Success state could include celebratory illustration (optional small accent, not primary focus)

## Interaction Patterns

**Wallet Connection:** Modal overlay with wallet options, network selector if wrong chain
**Loading States:** Inline spinners for buttons, skeleton screens for data-dependent sections, transaction pending shows animated indicator
**Error Handling:** Toast notifications for transient errors, inline error messages below inputs, clear retry actions
**Success Confirmations:** Checkmark animations, dismissible success banners with actionable next steps