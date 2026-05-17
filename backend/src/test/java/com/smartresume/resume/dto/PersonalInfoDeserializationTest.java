package com.smartresume.resume.dto;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartresume.resume.dto.ResumeDtos.PersonalInfo;
import org.junit.jupiter.api.Test;

class PersonalInfoDeserializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    void deserializesLegacyJsonWithoutAgeField() throws Exception {
        String legacyJson = """
            {
              "fullName": "张三",
              "headline": "前端工程师",
              "phone": "13800000000",
              "email": "zhangsan@example.com",
              "city": "北京",
              "website": "https://example.com",
              "expectedSalary": "20-30K",
              "avatar": "avatar.png"
            }
            """;

        PersonalInfo personalInfo = objectMapper.readValue(legacyJson, PersonalInfo.class);

        assertThat(personalInfo.fullName()).isEqualTo("张三");
        assertThat(personalInfo.headline()).isEqualTo("前端工程师");
        assertThat(personalInfo.phone()).isEqualTo("13800000000");
        assertThat(personalInfo.email()).isEqualTo("zhangsan@example.com");
        assertThat(personalInfo.city()).isEqualTo("北京");
        assertThat(personalInfo.website()).isEqualTo("https://example.com");
        assertThat(personalInfo.expectedSalary()).isEqualTo("20-30K");
        assertThat(personalInfo.avatar()).isEqualTo("avatar.png");
        assertThat(personalInfo.age()).isNull();
    }

    @Test
    void deserializesJsonWithAgeField() throws Exception {
        String json = """
            {
              "fullName": "李四",
              "headline": "后端工程师",
              "phone": "13900000000",
              "email": "lisi@example.com",
              "city": "上海",
              "website": "",
              "expectedSalary": "",
              "age": "28",
              "avatar": ""
            }
            """;

        PersonalInfo personalInfo = objectMapper.readValue(json, PersonalInfo.class);

        assertThat(personalInfo.fullName()).isEqualTo("李四");
        assertThat(personalInfo.age()).isEqualTo("28");
    }

    @Test
    void serializesAgeFieldRoundTrip() throws Exception {
        PersonalInfo original = new PersonalInfo(
            "王五",
            "全栈工程师",
            "13700000000",
            "wangwu@example.com",
            "深圳",
            "https://wangwu.dev",
            "30-40K",
            "32",
            ""
        );

        String json = objectMapper.writeValueAsString(original);
        PersonalInfo restored = objectMapper.readValue(json, PersonalInfo.class);

        assertThat(restored).isEqualTo(original);
    }
}
