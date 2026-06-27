# Docker 部署常见问题

## 数据库相关

### Q: 数据库是如何初始化的？

**A:** 初始化流程分三步：

1. **容器启动时自动创建数据库**
   - PostgreSQL 官方镜像会读取 `POSTGRES_DB` 环境变量
   - 自动创建该变量指定的数据库（默认 `smart_resume`）

2. **执行初始化脚本**
   - 容器在创建数据库后，以该数据库为上下文执行 `docker/init-db/` 下的所有 `.sql` 脚本
   - 当前脚本设置时区、创建扩展（uuid-ossp、pg_trgm）

3. **Flyway 执行数据库迁移**
   - Spring Boot 后端启动后，Flyway 自动执行 `backend/src/main/resources/db/migration/` 下的迁移脚本
   - 创建所有表结构、索引、初始数据

### Q: 如何验证数据库是否正确初始化？

**A:** 运行验证脚本：

```bash
./verify-db.sh
```

或手动连接数据库：

```bash
# 连接数据库
docker-compose exec database psql -U postgres -d smart_resume

# 查看所有表
\dt

# 查看扩展
\dx

# 退出
\q
```

### Q: 数据库初始化失败怎么办？

**A:** 完全重置数据库：

```bash
# 停止并删除所有容器和数据卷
docker-compose down -v

# 重新启动
docker-compose up -d
```

**注意：** `-v` 参数会删除所有数据，请谨慎使用。

### Q: 如何备份和恢复数据库？

**A:** 备份：

```bash
# 备份整个数据库
docker-compose exec database pg_dump -U postgres smart_resume > backup_$(date +%Y%m%d_%H%M%S).sql

# 备份为压缩格式
docker-compose exec database pg_dump -U postgres -Fc smart_resume > backup_$(date +%Y%m%d_%H%M%S).dump
```

恢复：

```bash
# 从 SQL 文件恢复
cat backup.sql | docker-compose exec -T database psql -U postgres -d smart_resume

# 从压缩格式恢复
docker-compose exec -T database pg_restore -U postgres -d smart_resume < backup.dump
```

### Q: 如何修改数据库密码？

**A:** 修改步骤：

1. 停止所有服务：`docker-compose down`
2. 编辑 `.env` 文件，修改 `DB_PASSWORD`
3. 删除数据卷（如果已有数据，先备份）：`docker volume rm smart-resume_postgres_data`
4. 重新启动：`docker-compose up -d`

如果不想删除数据，需要进入容器手动修改密码：

```bash
docker-compose exec database psql -U postgres
ALTER USER postgres WITH PASSWORD 'new_password';
\q
```

然后更新 `.env` 文件并重启后端服务。

## 后端相关

### Q: 后端启动失败，日志显示无法连接数据库？

**A:** 检查以下几点：

1. **数据库是否健康**：
   ```bash
   docker-compose ps
   # 确保 database 状态为 healthy
   ```

2. **网络连接**：
   ```bash
   docker-compose exec backend ping -c 3 database
   ```

3. **数据库连接信息**：检查 `.env` 中的 `DB_USER`、`DB_PASSWORD`、`DB_NAME` 是否正确

4. **查看详细日志**：
   ```bash
   docker-compose logs backend
   ```

### Q: 如何调整 JVM 内存？

**A:** 编辑 `.env` 文件：

```env
# 开发环境（小内存）
JAVA_OPTS=-Xms256m -Xmx512m

# 生产环境（推荐）
JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=200

# 大型应用
JAVA_OPTS=-Xms2g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200
```

修改后重启：`docker-compose restart backend`

### Q: 如何查看后端日志？

**A:** 多种方式：

```bash
# 实时查看
docker-compose logs -f backend

# 查看最近 100 行
docker-compose logs --tail=100 backend

# 导出日志到文件
docker-compose logs backend > backend.log

# 查看容器内的日志文件
docker-compose exec backend ls -lh /app/logs
```

## 前端相关

### Q: 前端无法访问后端 API？

**A:** 检查以下几点：

1. **后端是否启动**：
   ```bash
   docker-compose ps backend
   docker-compose logs backend
   ```

2. **Nginx 配置是否正确**：
   ```bash
   docker-compose exec nginx nginx -t
   docker-compose logs nginx
   ```

3. **网络连接**：
   ```bash
   docker-compose exec nginx nc -zv backend 8080
   ```

4. **手动测试 API**：
   ```bash
   curl http://localhost/api/health
   ```

### Q: 如何修改前端构建参数？

**A:** 编辑 `.env` 文件，然后重新构建：

```env
VITE_API_BASE_URL=/api
```

```bash
docker-compose build frontend
docker-compose up -d frontend
```

### Q: 前端静态资源缓存太久，修改后不生效？

**A:** 清除浏览器缓存或使用强制刷新（Ctrl+F5 / Cmd+Shift+R）。

Nginx 配置已经优化：
- HTML 文件不缓存（每次都获取最新）
- JS/CSS/图片缓存 30 天（文件名带 hash，修改后会自动变化）

## Nginx 相关

### Q: 如何启用 HTTPS？

**A:** 参考主文档的 [启用 HTTPS](README.md#启用-https) 章节。

简要步骤：
1. 准备 SSL 证书放到 `docker/nginx/ssl/`
2. 修改 `.env` 文件：`ENABLE_HTTPS=true`，按需设置 `NGINX_HTTPS_PORT=443`
3. 重新创建 Nginx 容器：`docker-compose up -d --force-recreate nginx`

如果缺少 `docker/nginx/ssl/cert.pem` 或 `docker/nginx/ssl/key.pem`，Nginx 容器会停止并在日志中提示证书文件缺失。

### Q: 如何修改 Nginx 配置？

**A:** 修改配置文件后重新加载：

```bash
# 编辑配置
vim docker/nginx/templates/default.conf.template
vim docker/nginx/snippets/proxy-locations.conf

# 重新创建 Nginx 容器以重新渲染模板
docker-compose up -d --force-recreate nginx

# 测试生成后的配置是否正确
docker-compose exec nginx nginx -t
```

### Q: Nginx 日志在哪里？

**A:** 两个位置：

```bash
# Docker 容器日志
docker-compose logs nginx

# 容器内的日志文件（通过卷持久化）
docker volume inspect smart-resume_nginx_logs
docker-compose exec nginx ls -lh /var/log/nginx
```

## 端口冲突

### Q: 端口被占用怎么办？

**A:** 修改 `.env` 文件中的端口配置：

```env
# 示例：如果 80 端口被占用，改为 8000
NGINX_HTTP_PORT=8000

# 如果 8080 端口被占用，改为 8081
BACKEND_PORT=8081

# 如果 5432 端口被占用，改为 5433
DB_PORT=5433
```

修改后重启：`docker-compose up -d`

访问地址相应改为：`http://localhost:8000`

### Q: 如何查看端口占用情况？

**A:** 

```bash
# Linux/Mac
netstat -tulpn | grep 80
lsof -i :80

# Windows
netstat -ano | findstr :80
```

## 性能优化

### Q: 如何优化 Docker 构建速度？

**A:** 几个建议：

1. **使用国内镜像源**（在 Dockerfile 中添加）：
   ```dockerfile
   # Maven 使用阿里云镜像
   RUN mkdir -p /root/.m2 && \
       echo '<settings><mirrors><mirror><id>aliyun</id><url>https://maven.aliyun.com/repository/public</url><mirrorOf>*</mirrorOf></mirror></mirrors></settings>' > /root/.m2/settings.xml
   
   # npm 使用淘宝镜像
   RUN npm config set registry https://registry.npmmirror.com
   ```

2. **利用 Docker 缓存**：
   - 先复制 `package.json` / `pom.xml`，再复制源代码
   - 依赖不变时可以跳过下载

3. **使用构建缓存**：
   ```bash
   docker-compose build --build-arg BUILDKIT_INLINE_CACHE=1
   ```

### Q: 如何减小镜像体积？

**A:** 已经采用的优化：

1. **多阶段构建**：构建阶段和运行阶段分离
2. **使用 Alpine 镜像**：基础镜像更小
3. **只复制必要文件**：不复制 node_modules、target 等

查看镜像大小：
```bash
docker images | grep smart-resume
```

## 开发调试

### Q: 如何在开发时只启动数据库？

**A:** 使用开发环境配置：

```bash
# 只启动数据库
docker-compose -f docker-compose.dev.yml up -d

# 本地启动后端和前端
cd backend && ./mvnw spring-boot:run
cd frontend && npm run dev
```

### Q: 如何进入容器调试？

**A:** 

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec database bash

# 进入 Nginx 容器
docker-compose exec nginx sh

# 以 root 用户进入（某些容器默认非 root）
docker-compose exec -u root backend sh
```

### Q: 如何查看容器资源使用情况？

**A:** 

```bash
# 实时监控
docker stats

# 查看特定容器
docker stats smart-resume-backend

# 查看磁盘使用
docker system df
```

## 生产环境

### Q: 生产环境部署需要注意什么？

**A:** 核心安全检查清单：

- [ ] 修改了 `DB_PASSWORD`（使用强密码）
- [ ] 修改了 `TOKEN_SECRET`（32 位以上随机字符串）
- [ ] 配置了 HTTPS（生产环境必须）
- [ ] 移除了数据库和后端的端口暴露（仅暴露 Nginx）
- [ ] 配置了定期备份策略
- [ ] 配置了日志收集和监控
- [ ] 设置了合理的 JVM 内存参数
- [ ] 测试了健康检查和服务重启

### Q: 如何限制容器资源使用？

**A:** 在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  backend:
    # ... 其他配置
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### Q: 如何配置自动重启？

**A:** 已经配置 `restart: unless-stopped`，意味着：
- 容器异常退出时自动重启
- Docker daemon 重启时自动启动容器
- 手动停止的容器不会自动启动

如果需要其他策略：
```yaml
restart: no           # 不自动重启
restart: always       # 总是重启（包括手动停止后）
restart: on-failure   # 仅在失败时重启
```

## 故障恢复

### Q: 服务崩溃如何快速恢复？

**A:** 

```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend

# 如果重启无效，重新创建容器
docker-compose up -d --force-recreate

# 查看崩溃原因
docker-compose logs --tail=500 backend
```

### Q: 如何完全清理并重新部署？

**A:** 

```bash
# 1. 备份数据库（如有重要数据）
./verify-db.sh  # 先确认数据库正常
docker-compose exec database pg_dump -U postgres smart_resume > backup.sql

# 2. 停止并删除所有容器、网络、卷
docker-compose down -v

# 3. 清理 Docker 缓存（可选）
docker system prune -a

# 4. 重新构建并启动
docker-compose up -d --build

# 5. 恢复数据库（如需要）
cat backup.sql | docker-compose exec -T database psql -U postgres -d smart_resume
```

## 更多帮助

如果以上内容未能解决你的问题，请：

1. 查看详细日志：`docker-compose logs -f`
2. 检查服务状态：`docker-compose ps`
3. 运行验证脚本：`./verify-db.sh`
4. 查看主文档：[README.md](README.md)
5. 提交 Issue 到项目仓库
