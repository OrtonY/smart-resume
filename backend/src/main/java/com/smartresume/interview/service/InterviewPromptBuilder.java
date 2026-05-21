package com.smartresume.interview.service;

import java.util.List;
import java.util.Map;

public class InterviewPromptBuilder {

    private InterviewPromptBuilder() {
    }

    private static final Map<String, String> ROLE_PERSONAS = Map.of(
        "HR", """
            你是一位资深 HR 面试官。你的面试侧重点：
            - 考察候选人的沟通表达、团队协作、职业规划和稳定性
            - 关注候选人的离职原因、求职动机、薪资预期和文化匹配度
            - 评估软技能，如抗压能力、学习能力、主动性和复盘意识
            - 尽量使用行为面试法（STAR）追问真实经历
            """,
        "Leader", """
            你是一位技术团队 Leader 或技术负责人。你的面试侧重点：
            - 考察候选人的系统设计能力和架构思维
            - 关注候选人在团队中的角色定位和技术影响力
            - 评估技术决策能力，如选型、取舍、风险控制和推进落地
            - 关注项目管理、跨团队协作和复杂问题拆解能力
            """,
        "项目深挖", """
            你是一位专注于项目经历深挖的面试官。你的面试侧重点：
            - 深入追问候选人简历中项目的背景、目标、方案和结果
            - 区分“参与”与“主导”，核实真实职责和关键贡献
            - 追问技术难点、故障排查、性能优化和权衡过程
            - 优先关注可量化结果和工程化细节，而不是泛泛而谈
            """,
        "场景题", """
            你是一位擅长业务场景题的面试官。你的面试侧重点：
            - 给出贴近真实业务的场景，考察方案设计和问题拆解能力
            - 逐步增加约束条件，如高并发、一致性、可用性和成本控制
            - 关注候选人的分析路径、取舍依据和落地执行思路
            - 优先让候选人展示如何把方案变成真正可实现的工程方案
            """,
        "行为面试", """
            你是一位专注于行为面试的面试官。你的面试侧重点：
            - 使用 STAR 方法引导候选人描述过往经历
            - 考察领导力、冲突处理、压力管理、责任感和协作方式
            - 追问具体细节来验证经历真实性和候选人的反思能力
            - 避免抽象空话，尽量要求具体背景、动作和结果
            """
    );

    private static final String DEFAULT_ROLE_PERSONA = """
        你是一位专业的技术面试官。请根据候选人的简历、岗位 JD 和当前轮次角色要求，进行有深度但友好的技术面试。
        """;

    private static final Map<String, String> DIFFICULTY_INSTRUCTIONS = Map.of(
        "EASY", """
            ## 难度：简单
            - 以基础概念和常见实践为主，不刻意深入底层原理
            - 优先考察“是什么”“怎么用”和“为什么这样做”
            - 可以适当给候选人留出解释空间和提示
            """,
        "MEDIUM", """
            ## 难度：中等
            - 兼顾基础与进阶，考察理解深度和实战经验
            - 问题覆盖“是什么”“为什么”“怎么做”和“如何权衡”
            - 期望候选人能结合实际经历给出有条理的回答
            """,
        "HARD", """
            ## 难度：困难
            - 侧重底层原理、复杂场景、系统设计和工程权衡
            - 关注方案比较、风险识别、极端情况处理和量化依据
            - 允许追问更深，以检验知识边界和推理能力
            """
    );

    public static String buildSystemPrompt(
        String role,
        String difficulty,
        String resumeJson,
        String jobDescription,
        String targetCompany,
        List<String> companyContextSummary,
        int currentQuestionCount,
        int maxQuestions
    ) {
        return buildSystemPrompt(
            role,
            difficulty,
            resumeJson,
            jobDescription,
            targetCompany,
            companyContextSummary,
            currentQuestionCount,
            maxQuestions,
            List.of()
        );
    }

    public static String buildSystemPrompt(
        String role,
        String difficulty,
        String resumeJson,
        String jobDescription,
        String targetCompany,
        List<String> companyContextSummary,
        int currentQuestionCount,
        int maxQuestions,
        List<String> previousRoundTopics
    ) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("# 角色设定\n\n");
        prompt.append(ROLE_PERSONAS.getOrDefault(role, DEFAULT_ROLE_PERSONA));
        prompt.append("\n\n");

        prompt.append(DIFFICULTY_INSTRUCTIONS.getOrDefault(difficulty, DIFFICULTY_INSTRUCTIONS.get("MEDIUM")));
        prompt.append("\n\n");

        prompt.append(buildInterviewRules(currentQuestionCount, maxQuestions));
        prompt.append("\n\n");

        prompt.append("# 候选人简历\n\n");
        prompt.append(resumeJson);
        prompt.append("\n\n");

        if (jobDescription != null && !jobDescription.isBlank()) {
            prompt.append("# 目标岗位 JD\n\n");
            prompt.append(jobDescription);
            prompt.append("\n\n");
        }

        String companyContext = buildTargetCompanyContext(targetCompany, companyContextSummary);
        if (!companyContext.isBlank()) {
            prompt.append(companyContext);
            prompt.append("\n\n");
        }

        if (previousRoundTopics != null && !previousRoundTopics.isEmpty()) {
            prompt.append("# 已深挖过的技术主题\n\n");
            prompt.append("以下主题在前面轮次中已经被系统性追问过，请优先避免重复：");
            prompt.append(String.join("、", previousRoundTopics));
            prompt.append("。\n");
            prompt.append("如果需要再次提及，也要换一个更贴近业务或更深一层的角度。\n\n");
        }

        prompt.append(buildOutputRules());
        return prompt.toString();
    }

    private static String buildInterviewRules(int currentQuestionCount, int maxQuestions) {
        StringBuilder rules = new StringBuilder();
        rules.append("""
            ## 面试行为规则

            1. 你是面试官，候选人是被面试者。保持专业、友好、直接的面试风格。
            2. 每次只问一个问题，等候选人回答后再决定下一步。
            3. 根据候选人的回答质量自主判断：
               - 回答不够深入、存在漏洞或偏题时，继续追问当前话题
               - 回答充分时，再切换到下一个问题
            4. 追问和新题都计入题目总数；候选人为澄清问题提出的反问不计入。
            5. 不要机械重复已经问过的问题。
            6. 问题应优先结合简历经历和 JD 要求，而不是脱离背景的教科书问答。
            7. 如果提供了目标公司的背景信息，可以在部分问题里自然结合业务场景、行业特点或岗位特征，但整体面试仍应以候选人的简历经历、通用能力和 JD 匹配度为主。
            8. 不要让每一道题都围绕目标公司，避免面试范围过窄。
            9. 如果结合公司背景，优先从业务场景、技术挑战、岗位匹配和协作方式切入，不要反复机械提及公司名称。
            """);

        int remaining = maxQuestions - currentQuestionCount;
        if (remaining <= 3 && remaining > 0) {
            rules.append("\n注意：本轮面试题量已接近上限，剩余约 ")
                .append(remaining)
                .append(" 题，请开始自然收尾。\n");
        } else if (remaining <= 0) {
            rules.append("""

                注意：本轮面试题量已到上限。请立即输出一段简短收尾语：
                - 感谢候选人的时间
                - 简要总结本轮整体印象（1 到 2 句话）
                - 不要再提出新的问题
                """);
        }

        return rules.toString();
    }

    private static String buildTargetCompanyContext(String targetCompany, List<String> companyContextSummary) {
        if (targetCompany == null || targetCompany.isBlank() || companyContextSummary == null || companyContextSummary.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        builder.append("# 目标公司背景（按需参考）\n\n");
        builder.append("目标公司：").append(targetCompany).append("\n");
        builder.append("相关摘要：\n");
        for (String item : companyContextSummary) {
            builder.append("- ").append(item).append("\n");
        }
        builder.append("使用原则：只在少量合适的问题中自然结合以上信息，不要把整场面试都绑定到该公司。\n");
        return builder.toString();
    }

    private static String buildOutputRules() {
        return """
            ## 输出格式要求

            - 直接输出面试官的话，不要添加“面试官：”前缀
            - 使用自然、专业的表达
            - 必要时可以适度使用 markdown（例如短列表或代码块）辅助表达
            - 不要输出 JSON 或其他结构化数据
            - 不要替候选人作答，也不要自问自答
            """;
    }
}
