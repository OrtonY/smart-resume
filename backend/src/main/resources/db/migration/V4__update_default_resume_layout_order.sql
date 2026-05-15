alter table resumes
    alter column layout_json set default '{"sectionOrder":["education","summary","workExperience","projectExperience","skills","honors","certificates"],"hiddenSections":[]}';

alter table resume_versions
    alter column layout_json set default '{"sectionOrder":["education","summary","workExperience","projectExperience","skills","honors","certificates"],"hiddenSections":[]}';
