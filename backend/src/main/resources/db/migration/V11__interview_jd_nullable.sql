-- Make job_description nullable (JD is now optional for AI interviews)
alter table interview_sessions alter column job_description drop not null;
