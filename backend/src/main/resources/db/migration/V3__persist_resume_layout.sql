alter table resumes
    add column if not exists layout_json text;

update resumes
set layout_json = '{"sectionOrder":["summary","workExperience","projectExperience","education","skills","honors","certificates"],"hiddenSections":[]}'
where layout_json is null;

alter table resumes
    alter column layout_json set not null;

alter table resumes
    alter column layout_json set default '{"sectionOrder":["summary","workExperience","projectExperience","education","skills","honors","certificates"],"hiddenSections":[]}';

alter table resume_versions
    add column if not exists layout_json text;

update resume_versions
set layout_json = '{"sectionOrder":["summary","workExperience","projectExperience","education","skills","honors","certificates"],"hiddenSections":[]}'
where layout_json is null;

alter table resume_versions
    alter column layout_json set not null;

alter table resume_versions
    alter column layout_json set default '{"sectionOrder":["summary","workExperience","projectExperience","education","skills","honors","certificates"],"hiddenSections":[]}';
