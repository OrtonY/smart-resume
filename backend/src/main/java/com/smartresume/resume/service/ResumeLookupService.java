package com.smartresume.resume.service;

import com.smartresume.common.exception.AppException;
import com.smartresume.resume.domain.ResumeEntity;
import com.smartresume.resume.mapper.ResumeMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class ResumeLookupService {

    private final ResumeMapper resumeMapper;

    public ResumeLookupService(ResumeMapper resumeMapper) {
        this.resumeMapper = resumeMapper;
    }

    public ResumeEntity requireResume(String resumeId, long userId) {
        ResumeEntity resume = resumeMapper.selectOneById(resumeId);
        if (resume == null || !Long.valueOf(userId).equals(resume.getUserId())) {
            throw AppException.of(HttpStatus.NOT_FOUND, "error.resume.notFound");
        }
        return resume;
    }

    public ResumeEntity requireActiveResume(String resumeId, long userId) {
        ResumeEntity resume = requireResume(resumeId, userId);
        if (Boolean.TRUE.equals(resume.getDeleted())) {
            throw AppException.of(HttpStatus.CONFLICT, "error.resume.alreadyDeleted");
        }
        return resume;
    }
}
