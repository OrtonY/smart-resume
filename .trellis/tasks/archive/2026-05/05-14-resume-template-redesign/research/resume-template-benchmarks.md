# Resume Template Benchmarks

## Purpose

Capture real-world resume template patterns to guide the redesign of the Smart Resume preview.

## Sources

* Enhancv Resume Templates: https://enhancv.com/resume-templates/
* Enhancv Two-Column Resume Templates: https://enhancv.com/resume-templates/two-column/
* Enhancv ATS Resume Templates: https://enhancv.com/resume-templates/ats/
* Novoresume Resume Templates: https://novoresume.com/resume-templates
* Novoresume Resume Examples: https://novoresume.com/career-blog/resume-examples
* Canva Resume Builder / Templates: https://www.canva.com/create/resumes/

## High-signal findings

### 1. Real template systems differentiate layout, not only color

Across Enhancv, Novoresume, and Canva, template families differ in:

* one-column vs two-column structure
* top-banner vs sidebar identity placement
* density of metadata
* section heading treatment
* whether skills live in a sidebar, chips row, or compact list

This directly exposes the main weakness in our current implementation: all three templates share the same structure.

### 2. Two-column is the strongest mainstream pattern for "designed but professional"

Enhancv's two-column collection repeatedly positions it as suitable for professional, elegant, and modern use cases. The recurring structure is:

* compact personal/contact information on the side
* main timeline content in the wider column
* strong scan path from identity to experience

This is a good fit for our existing schema because we already have clear "supporting" sections like skills and certificates that belong naturally in a side rail.

### 3. ATS-safe templates still use hierarchy, just with restraint

Enhancv's ATS-focused templates and Novoresume's simpler examples still emphasize:

* strong name/header block
* crisp section separators
* clear chronology
* reduced visual noise

So "ATS-friendly" should not mean "unstyled card list." It should mean minimal, ordered, and legible.

### 4. Creative / modern templates use identity-first composition

Template libraries for creative and modern resumes tend to:

* enlarge the top header area
* foreground headline, portfolio, or role identity
* use asymmetry or highlighted accent blocks
* make projects feel more prominent

This suggests a second future template direction after a more professional default.

## Recommended direction for this task

### Primary recommendation: Executive Two-Column

Why:

* Most obviously improves over the current layout
* Reads like a real resume instead of an application card
* Maps cleanly to our existing data model
* Leaves room for a later minimalist template and a later editorial template

## Candidate mapping to our current templates

### `north-star`

Best fit: executive / elegant two-column

### `ink-flow`

Best fit: modern editorial / portfolio-leaning

### `grid-slate`

Best fit: compact modern ATS-friendly hybrid

## Implications for implementation

* Template rendering should branch earlier at the layout level, not only at class names.
* Shared helpers should focus on section rendering and empty-state logic.
* CSS should define per-template layout systems, not only hero gradients.
