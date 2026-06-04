package com.smartresume.interview.mapper;

import com.mybatisflex.core.BaseMapper;
import com.smartresume.interview.domain.InterviewQuestionEntity;
import java.util.List;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

public interface InterviewQuestionMapper extends BaseMapper<InterviewQuestionEntity> {

    @Select("""
        <script>
        select
          id,
          user_id as userId,
          question_bank_id as questionBankId,
          question,
          difficulty,
          tags_json as tagsJson,
          focus_points as focusPoints,
          created_at as createdAt,
          updated_at as updatedAt
        from interview_questions
        where user_id = #{userId}
          and question_bank_id = #{bankId}
        <if test="usedIds != null and usedIds.size() > 0">
          and id not in
          <foreach collection="usedIds" item="usedId" open="(" separator="," close=")">
            #{usedId}
          </foreach>
        </if>
        <if test="tags != null and tags.size() > 0">
          and (
          <foreach collection="tags" item="tag" separator=" or ">
            tags_json like concat('%&quot;', #{tag}, '&quot;%')
          </foreach>
          )
        </if>
        order by random()
        limit #{limit}
        </script>
        """)
    List<InterviewQuestionEntity> selectRandomForPrompt(
        @Param("userId") long userId,
        @Param("bankId") String bankId,
        @Param("tags") List<String> tags,
        @Param("usedIds") List<String> usedIds,
        @Param("limit") int limit
    );
}
