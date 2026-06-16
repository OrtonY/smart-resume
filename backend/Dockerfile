# 多阶段构建 - 构建阶段
FROM maven:3.9-amazoncorretto-21-alpine AS builder

WORKDIR /app

# 复制 Maven 配置文件
COPY pom.xml .
COPY .mvn .mvn
COPY mvnw .

# 下载依赖（利用 Docker 缓存层）
RUN ./mvnw dependency:go-offline -B

# 复制源代码
COPY src ./src

# 构建应用（跳过测试以加快构建速度，生产环境建议启用测试）
RUN ./mvnw clean package -DskipTests -B

# 运行阶段
FROM alpine/java:21-jre

WORKDIR /app

# 添加非 root 用户
RUN addgroup -S spring && adduser -S spring -G spring

# 从构建阶段复制 JAR 文件
COPY --from=builder /app/target/*.jar app.jar

# 更改文件所有者
RUN chown -R spring:spring /app

# 创建日志目录
RUN mkdir -p /app/logs && chown -R spring:spring /app/logs

# 切换到非 root 用户
USER spring:spring

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# 启动应用
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
