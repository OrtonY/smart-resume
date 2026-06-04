package com.smartresume.interview.controller;

import com.smartresume.common.api.ApiResponse;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionBankCreateRequest;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionBankResponse;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionBankUpdateRequest;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionCreateRequest;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionResponse;
import com.smartresume.interview.dto.InterviewQuestionBankDtos.QuestionUpdateRequest;
import com.smartresume.interview.service.InterviewQuestionBankService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/interviews/question-banks")
public class InterviewQuestionBankController {

    private final InterviewQuestionBankService questionBankService;

    public InterviewQuestionBankController(InterviewQuestionBankService questionBankService) {
        this.questionBankService = questionBankService;
    }

    @GetMapping
    public ApiResponse<List<QuestionBankResponse>> listBanks(@RequestParam(required = false) String keyword) {
        return ApiResponse.success(questionBankService.listBanks(keyword));
    }

    @PostMapping
    public ApiResponse<QuestionBankResponse> createBank(@Valid @RequestBody QuestionBankCreateRequest request) {
        return ApiResponse.success(questionBankService.createBank(request), "Question bank created");
    }

    @GetMapping("/{bankId}")
    public ApiResponse<QuestionBankResponse> getBank(@PathVariable String bankId) {
        return ApiResponse.success(questionBankService.getBank(bankId));
    }

    @PutMapping("/{bankId}")
    public ApiResponse<QuestionBankResponse> updateBank(
        @PathVariable String bankId,
        @Valid @RequestBody QuestionBankUpdateRequest request
    ) {
        return ApiResponse.success(questionBankService.updateBank(bankId, request), "Question bank updated");
    }

    @DeleteMapping("/{bankId}")
    public ApiResponse<Void> deleteBank(@PathVariable String bankId) {
        questionBankService.deleteBank(bankId);
        return ApiResponse.success(null, "Question bank deleted");
    }

    @GetMapping("/{bankId}/questions")
    public ApiResponse<List<QuestionResponse>> listQuestions(@PathVariable String bankId) {
        return ApiResponse.success(questionBankService.listQuestions(bankId));
    }

    @PostMapping("/{bankId}/questions")
    public ApiResponse<QuestionResponse> createQuestion(
        @PathVariable String bankId,
        @Valid @RequestBody QuestionCreateRequest request
    ) {
        return ApiResponse.success(questionBankService.createQuestion(bankId, request), "Question created");
    }

    @PutMapping("/{bankId}/questions/{questionId}")
    public ApiResponse<QuestionResponse> updateQuestion(
        @PathVariable String bankId,
        @PathVariable String questionId,
        @Valid @RequestBody QuestionUpdateRequest request
    ) {
        return ApiResponse.success(questionBankService.updateQuestion(bankId, questionId, request), "Question updated");
    }

    @DeleteMapping("/{bankId}/questions/{questionId}")
    public ApiResponse<Void> deleteQuestion(
        @PathVariable String bankId,
        @PathVariable String questionId
    ) {
        questionBankService.deleteQuestion(bankId, questionId);
        return ApiResponse.success(null, "Question deleted");
    }
}
