# Aurelia — Design Direction

## Three Initial Directions

### Theme Name: Velvet Ledger
Very dark oxblood surfaces, antique gold rules, and editorial typography make the interface feel like a private members’ archive.
Probability: 0.07

### Theme Name: Sunlit Salon
A warm ivory canvas with lacquer red blocks and polished brass accents creates a bright, gallery-like luxury system.
Probability: 0.03

### Theme Name: Garnet Signal
A restrained red-black interface with metallic gold highlights and sharp, asymmetric geometry gives the product a confident modern edge.
Probability: 0.08

## Chosen Approach: Velvet Ledger

### Design Movement
Contemporary editorial luxury, borrowing from Swiss poster composition, museum catalogues, and tactile material studies.

### Core Principles
1. Use asymmetry and generous negative space to create a composed, art-directed rhythm.
2. Treat gold as a scarce signal for value, focus, and action rather than a blanket decoration.
3. Pair tactile materials—velvet, paper grain, brushed metal—with crisp interface geometry.
4. Keep every interaction quiet, immediate, and intentional.

### Color Philosophy
The foundation is near-black garnet (#18090d) and oxblood (#5f101c), creating a private, enveloping atmosphere. Antique gold (#d6a84f) appears only where the eye should pause: navigation markers, active states, key metrics, and primary actions. Bone (#f4ead6) softens the contrast so the interface feels editorial rather than theatrical.

### Layout Paradigm
A left-anchored navigation rail and offset content field create a magazine-spread composition. Hero copy sits in a narrow column while the visual field carries weight on the opposite side. Content cards are arranged as a staggered ledger, not a uniform centered grid.

### Signature Elements
- Hairline gold rules and numbered section markers.
- A circular gold-and-red emblem used at a readable scale in brand moments.
- Tactile texture panels that shift subtly on hover instead of relying on generic gradients.

### Interaction Philosophy
Interactions should feel like turning a page in a well-made catalogue: focus states are visible gold underlines, hover states reveal a slight lift and richer texture, and primary buttons respond with a compact press rather than a dramatic animation.

### Animation
Use 180–260ms ease-out transitions for hover, focus, and panel reveals. Stagger hero text and ledger rows by 50ms. Animate only opacity and transform. Respect reduced-motion preferences and keep navigation actions instant.

### Typography System
Display: Cormorant Garamond, with italic emphasis for editorial warmth. UI/body: DM Sans for legibility and compact metadata. Use large serif headlines with tight line-height, uppercase DM Sans labels with generous tracking, and tabular numerals for metrics.

### Brand Essence
Aurelia is a visual command desk for people who curate high-value work, designed to make every decision feel deliberate and beautifully documented.
Personality: discerning, composed, luminous.

### Brand Voice
Headlines are concise and quietly confident. CTAs are specific and directional. Microcopy reads like notes from a thoughtful editor, never like generic SaaS filler.

Example lines:
- “Make the next move visible.”
- “Open the ledger.”

### Wordmark & Logo
The wordmark uses a high-contrast serif with a custom cut through the crossbar of the A. The emblem is a gold sun-disc intersected by a sharp red diagonal, signaling clarity emerging from depth.

### Signature Brand Color
Antique Aurelia Gold — #D6A84F.

## Style Decisions

- All utility and error states remain inside the Velvet Ledger world: near-black garnet/oxblood surfaces, bone serif headlines, antique gold actions, and no default blue/red system colors.
- Error-page copy frames absence as a misplaced or closed ledger entry rather than generic page-not-found messaging.
- The Aurelia emblem and wordmark appear on every standalone page state so the brand remains recognizable beyond the main dashboard.
