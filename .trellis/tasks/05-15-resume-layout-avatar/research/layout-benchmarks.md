# Resume Layout Benchmarks

## Sources

- Enhancv photo resume templates: https://enhancv.com/resume-templates/photo/
- Novoresume guide on resume photos: https://novoresume.com/career-blog/including-photo-on-resume
- Zety resume header guide: https://zety.com/blog/resume-header
- Novoresume resume structure guide: https://novoresume.com/career-blog/resume-structure

## Common patterns observed

- The header stays dominant: name, role/headline, and compact contact details are always the first scan target.
- When a photo is supported, it is optional and placed near the top beside the identity block, not as a large hero image.
- Photo-based layouts keep the image small, professional, and tightly cropped; common placements are top-right, top-left, or inside a narrow sidebar.
- The main reading column prioritizes summary, work experience, and projects.
- Supporting content such as skills, certificates, and honors is usually grouped in a secondary column or sidebar.
- Good resume layouts reduce repeated section chrome and make the section order easy to scan in 5-10 seconds.

## Implications for this repo

- We should preserve the current "identity first" preview model, but strengthen hierarchy inside the top block.
- Avatar support should be optional and visually integrated into the header area across templates.
- The editor should group avatar controls with personal info, instead of treating them as a separate resume section.
- The existing template system already supports multiple header/body layouts, so the most cost-effective change is to improve those layouts rather than introducing a brand-new rendering engine.
