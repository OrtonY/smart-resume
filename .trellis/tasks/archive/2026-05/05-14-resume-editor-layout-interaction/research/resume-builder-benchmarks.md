# Resume Builder Benchmarks

## External References

1. Resume.io help center says the builder supports section-level reorder, rename, and delete interactions, with drag handles on the section title and hover actions for rename/delete.
   Source: https://help.resume.io/en/articles/3784640

2. Resume.io documents real-time preview on the right side of the builder, and page navigation below the preview for multi-page resumes.
   Source: https://help.resume.io/en/articles/3785216

3. Resume.io places autosave feedback near the preview area, switching between saving and saved while the user types.
   Source: https://help.resume.io/en/articles/3785472

4. Reactive Resume treats movement between sections and even between pages as a first-class builder action.
   The docs describe item-level move actions, destination-aware submenus, and verification through both the left sidebar and preview.
   Source: https://docs.rxresu.me/guides/moving-items-between-sections

5. Reactive Resume exposes export as a dedicated builder area instead of mixing it into the content form itself.
   It also distinguishes quick export from more descriptive export options.
   Source: https://docs.rxresu.me/guides/exporting-your-resume

6. Reactive Resume provides explicit overflow feedback when content exceeds page height, then guides the user to fix content, spacing, layout ratio, or page format.
   Source: https://docs.rxresu.me/guides/fitting-content-on-a-page

## Conventions Observed Across Tools

* The active resume is edited in a dedicated builder context, not inside the resume-list sidebar.
* The left side usually represents structure:
  sections, items, pages, and available blocks.
* The preview stays visible and reacts in real time.
* Autosave is visible but quiet.
* Export/share are available globally, but do not compete with text fields for attention.
* Reorder and visibility controls are attached to sections or items, not buried in a separate settings page.
* Overflow or page-break issues are surfaced inside the builder, not discovered only after export.

## Mapping to This Project

Recommended baseline for this repo:

* Keep a dedicated editor route for a single resume
* Use the left rail for current-resume structure and section insertion
* Use the center canvas for section editing cards
* Keep the right rail for preview, autosave state, and page/overflow status
* Move share history and template management out of the default editing stack

## Initial Conclusion

The reference image is closer to prevailing resume-builder patterns than the current workspace implementation.
For this project, the best-practice direction is not just visual polishing.
It is a shift in information architecture from "dashboard + form" to "builder + structure + preview".
