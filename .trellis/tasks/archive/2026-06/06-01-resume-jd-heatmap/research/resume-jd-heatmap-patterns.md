# Resume JD Heatmap Patterns

## Sources

* Jobscan resume scanner: https://www.jobscan.co/resume-scanner
* Teal resume job description matching: https://www.tealhq.com/tools/resume-builder
* Resume Worded resume scanner / targeted resume: https://resumeworded.com/resume-scanner

## Findings

Comparable tools usually frame the value as job-specific resume alignment rather than a generic score.

Common patterns:

* Overall match or score to create a quick read.
* Keyword/skill extraction from the JD.
* Missing keyword list and matched keyword list.
* ATS/readability checks alongside content matching.
* Concrete recommendations users can apply to their resume.

## Product Implication

For this project, a "heatmap" should not be just a colorful score panel. It should expose structured match evidence:

* requirement or keyword text
* category such as skill, experience, education, seniority, domain, tool
* match status
* related resume section keys
* explanation and suggested edit

## Recommended Shape

Use a keyword/requirement matrix as MVP and optionally add section-level heat later. This keeps the feature actionable and fits the existing AI scoring modal with the least architecture churn.

