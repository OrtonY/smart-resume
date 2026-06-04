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
            - 区分"参与"与"主导"，核实真实职责和关键贡献
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
            - 优先考察"是什么""怎么用"和"为什么这样做"
            - 可以适当给候选人留出解释空间和提示
            """,
        "MEDIUM", """
            ## 难度：中等
            - 兼顾基础与进阶，考察理解深度和实战经验
            - 问题覆盖"是什么""为什么""怎么做"和"如何权衡"
            - 期望候选人能结合实际经历给出有条理的回答
            """,
        "HARD", """
            ## 难度：困难
            - 侧重底层原理、复杂场景、系统设计和工程权衡
            - 关注方案比较、风险识别、极端情况处理和量化依据
            - 允许追问更深，以检验知识边界和推理能力
            """
    );

    public record QuestionBankPromptItem(String question, List<String> focusPoints) {
    }

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
            List.of(),
            null,
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
        return buildSystemPrompt(
            role,
            difficulty,
            resumeJson,
            jobDescription,
            targetCompany,
            companyContextSummary,
            currentQuestionCount,
            maxQuestions,
            previousRoundTopics,
            null,
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
        List<String> previousRoundTopics,
        String questionBankRelevance,
        List<QuestionBankPromptItem> questionBankQuestions
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

        String questionBankContext = buildQuestionBankContext(questionBankRelevance, questionBankQuestions);
        if (!questionBankContext.isBlank()) {
            prompt.append(questionBankContext);
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
        if (remaining <= InterviewConstants.QUESTION_LIMIT_WARNING_THRESHOLD && remaining > 0) {
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

    private static String buildQuestionBankContext(String relevance, List<QuestionBankPromptItem> questions) {
        if (questions == null || questions.isEmpty()) {
            return "";
        }

        StringBuilder builder = new StringBuilder();
        builder.append("# 面试题库参考（后端已随机抽样）\n\n");
        builder.append(buildQuestionBankRelevanceRule(relevance));
        builder.append("\n");
        builder.append("使用原则：\n");
        builder.append("- 题库内容只作为本轮出题素材和考察点参考，不要逐题机械复述。\n");
        builder.append("- 仍需优先结合候选人简历、JD、面试官角色、难度和候选人当前回答动态追问。\n");
        builder.append("- 每次只问一个问题，可以围绕抽样题目改写、组合或追问，但不要暴露题库列表。\n");
        builder.append("抽样题目：\n");
        int index = 1;
        for (QuestionBankPromptItem question : questions) {
            if (question == null || question.question() == null || question.question().isBlank()) {
                continue;
            }
            builder.append(index++).append(". ").append(question.question().trim()).append("\n");
            if (question.focusPoints() != null && !question.focusPoints().isEmpty()) {
                builder.append("   考察点：").append(String.join("、", question.focusPoints())).append("\n");
            }
        }
        return builder.toString();
    }

    private static String buildQuestionBankRelevanceRule(String relevance) {
        if (relevance == null || relevance.isBlank()) {
            return "题库相关度：中。题库提供本轮主要参考方向，但你仍可根据候选人回答追问和切换问题。";
        }
        return switch (relevance) {
            case InterviewConstants.QUESTION_BANK_RELEVANCE_LOW ->
                "题库相关度：低。题库只提供少量主题参考，面试主体仍应围绕简历、JD 和候选人回答展开。";
            case InterviewConstants.QUESTION_BANK_RELEVANCE_HIGH ->
                "题库相关度：高。优先覆盖题库核心题目或主题，但仍要保留自然追问和必要的问题切换。";
            default ->
                "题库相关度：中。题库提供本轮主要参考方向，但你仍可根据候选人回答追问和切换问题。";
        };
    }

    private static String buildOutputRules() {
        return """
            ## 输出格式要求

            - 直接输出面试官的话，不要添加"面试官："前缀
            - 使用自然、专业的表达
            - 必要时可以适度使用 markdown（例如短列表或代码块）辅助表达
            - 不要输出 JSON 或其他结构化数据
            - 不要替候选人作答，也不要自问自答
            """;
    }

    public static String buildAnswerSystemPrompt(
        String role,
        String difficulty,
        String resumeJson,
        String jobDescription,
        String targetCompany,
        List<String> companyContextSummary,
        String questionContent
    ) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("# 角色设定\n\n");
        prompt.append("""
            你是一位理想候选人，正在参加一场模拟面试。你需要基于提供的简历信息、岗位 JD 和面试上下文，
            给出一份高质量的参考答案。你的回答应该：
            - 结构清晰，逻辑严密
            - 结合简历中的真实经历和项目细节
            - 展示深度思考和专业素养
            - 适当使用 STAR 法则（情境、任务、行动、结果）
            - 体现对技术原理的理解，而不仅仅是表面描述
            """);
        prompt.append("\n\n");

        prompt.append("# 面试上下文\n\n");
        prompt.append("- 面试官角色：").append(role).append("\n");
        prompt.append("- 面试难度：").append(difficulty).append("\n\n");

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

        prompt.append("# 面试官的问题\n\n");
        prompt.append(questionContent);
        prompt.append("\n\n");

        prompt.append("""
            ## 输出要求

            - 直接输出候选人的回答内容，不要添加"候选人："前缀
            - 使用自然、专业的表达，像真实面试中的优秀回答
            - 可以使用 markdown 格式（列表、代码块等）让回答更清晰
            - 回答长度适中，既要有深度又不要冗长
            - 不要输出 JSON 或其他结构化数据
            """);

        return prompt.toString();
    }

    public static String buildScoreSystemPrompt(
        String role,
        String difficulty,
        String resumeJson,
        String jobDescription,
        String targetCompany,
        List<String> companyContextSummary,
        String questionContent,
        String candidateAnswer
    ) {
        StringBuilder prompt = new StringBuilder();

        prompt.append("# 角色设定\n\n");
        prompt.append("""
            你是一位资深面试教练，需要对候选人的面试回答进行评分和反馈。
            评分标准：
            - 内容完整性：是否覆盖了问题的核心要点
            - 技术深度：是否展示了对技术原理的理解
            - 逻辑清晰度：回答是否有条理、层次分明
            - 实践结合：是否结合了真实项目经验
            - 表达质量：语言是否专业、简洁、有说服力
            """);
        prompt.append("\n\n");

        prompt.append("# 面试上下文\n\n");
        prompt.append("- 面试官角色：").append(role).append("\n");
        prompt.append("- 面试难度：").append(difficulty).append("\n\n");

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

        prompt.append("# 面试官的问题\n\n");
        prompt.append(questionContent);
        prompt.append("\n\n");

        prompt.append("# 候选人的回答\n\n");
        prompt.append(candidateAnswer);
        prompt.append("\n\n");

        prompt.append("""
            ## 输出格式要求

            第一行必须是评分，格式为：SCORE: <0-100的整数>

            空一行后输出 markdown 格式的反馈，包含以下部分：
            ### 优点
            - 列出回答中的亮点

            ### 不足
            - 列出回答中的问题或遗漏

            ### 改进建议
            - 给出具体可操作的改进方向

            注意：
            - 评分要客观公正，不要过于宽松或严苛
            - 反馈要具体，避免空泛的评价
            - 改进建议要可操作，最好能给出示例方向
            """);

        return prompt.toString();
    }
}
