# Smart Resume Docker 部署指南

本项目使用 Docker Compose 实现一键部署，包含以下服务：
- **PostgreSQL 17.6** - 数据库
- **Spring Boot 3 + JDK 21** - 后端服务
- **React + Node 20** - 前端应用
- **Nginx** - 反向代理（解决跨域，统一访问入口）

## 部署架构

```
用户请求 → Nginx (80/443)
           ├─ / → Frontend (React 静态文件)
           └─ /api → Backend (Spring Boot)
                      └─ Database (PostgreSQL)
```

**数据库初始化流程：**
1. PostgreSQL 容器首次启动时自动创建 `POSTGRES_DB` 指定的数据库（默认 `smart_resume`）
2. 执行 `docker/init-db/` 目录下的 SQL 脚本（设置时区、创建扩展等）
3. Spring Boot 启动后，Flyway 自动执行数据库迁移（创建表结构）

## 快速开始

### 1. 环境准备

确保已安装：
- Docker >= 20.10
- Docker Compose >= 2.0

### 2. 配置环境变量

```bash
# 复制环境变量配置文件
cp .env.example .env

# 编辑配置文件，修改必要的配置项
vim .env
```

**重要配置项说明：**

| 配置项 | 说明 | 默认值 | 是否必须修改 |
|--------|------|--------|--------------|
| `DB_PASSWORD` | 数据库密码 | `postgres` | ✅ 生产环境必须修改 |
| `TOKEN_SECRET` | JWT 密钥 | `change-me-in-production-use-a-long-random-string` | ✅ 生产环境必须修改 |
| `NGINX_HTTP_PORT` | HTTP 端口 | `80` | ⚠️ 端口冲突时修改 |
| `BACKEND_PORT` | 后端服务端口 | `8080` | ⚠️ 端口冲突时修改 |
| `DB_PORT` | 数据库端口 | `5432` | ⚠️ 端口冲突时修改 |

### 3. 启动服务

```bash
# 构建并启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f
```

### 4. 访问应用

- **前端应用**: http://localhost
- **后端 API**: http://localhost/api
- **数据库**: localhost:5432

### 5. 验证部署（可选）

运行验证脚本检查数据库初始化状态：

```bash
./verify-db.sh
```

## 常见问题

部署过程中遇到问题？查看 [FAQ 文档](FAQ.md) 获取详细的故障排查指南。

常见问题包括：
- 数据库初始化和连接问题
- 端口冲突解决方案
- 后端启动失败排查
- Nginx 配置和 HTTPS 设置
- 性能优化建议

## 常用命令

### 服务管理

```bash
# 启动服务
docker-compose up -d

# 停止服务
docker-compose stop

# 重启服务
docker-compose restart

# 停止并删除服务（保留数据卷）
docker-compose down

# 停止并删除服务及数据卷（⚠️ 会删除数据库数据）
docker-compose down -v

# 重新构建镜像
docker-compose build

# 重新构建并启动
docker-compose up -d --build
```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f database
docker-compose logs -f nginx

# 查看最近 100 行日志
docker-compose logs --tail=100 backend
```

### 进入容器

```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec database psql -U postgres -d smart_resume

# 进入 Nginx 容器
docker-compose exec nginx sh
```

### 数据库操作

```bash
# 连接数据库
docker-compose exec database psql -U postgres -d smart_resume

# 备份数据库
docker-compose exec database pg_dump -U postgres smart_resume > backup.sql

# 恢复数据库
cat backup.sql | docker-compose exec -T database psql -U postgres -d smart_resume
```

## 目录结构

```
.
├── docker-compose.yml          # Docker Compose 主配置文件
├── .env.example                # 环境变量配置示例
├── .env                        # 环境变量配置（需自行创建）
├── backend/
│   └── Dockerfile              # 后端服务 Dockerfile
├── frontend/
│   └── Dockerfile              # 前端服务 Dockerfile
└── docker/
    ├── nginx/
    │   ├── nginx.conf          # Nginx 主配置
    │   ├── conf.d/
    │   │   └── default.conf    # 站点配置（反向代理规则）
    │   └── ssl/                # SSL 证书目录（可选）
    └── init-db/
        └── 01-init.sql         # 数据库初始化脚本
```

## 高级配置

### 启用 HTTPS

1. 准备 SSL 证书，将证书文件放到 `docker/nginx/ssl/` 目录：
   ```
   docker/nginx/ssl/cert.pem
   docker/nginx/ssl/key.pem
   ```

2. 编辑 `docker/nginx/conf.d/default.conf`，取消 HTTPS server 块的注释

3. 修改 `.env` 文件：
   ```env
   ENABLE_HTTPS=true
   NGINX_HTTPS_PORT=443
   ```

4. 重启 Nginx 服务：
   ```bash
   docker-compose restart nginx
   ```

### 自定义 JVM 参数

编辑 `.env` 文件：
```env
JAVA_OPTS=-Xms1g -Xmx2g -XX:+UseG1GC -XX:MaxGCPauseMillis=200
```

### 修改 Nginx 配置

1. 编辑 `docker/nginx/conf.d/default.conf`
2. 重新加载配置：
   ```bash
   docker-compose exec nginx nginx -s reload
   ```

### 数据持久化

数据通过 Docker 卷进行持久化：
- `postgres_data` - 数据库数据
- `backend_logs` - 后端日志
- `maven_cache` - Maven 依赖缓存
- `nginx_logs` - Nginx 日志

查看卷信息：
```bash
docker volume ls
docker volume inspect smart-resume_postgres_data
```

## 生产环境部署建议

### 安全配置

1. **修改默认密码**：
   - 数据库密码 `DB_PASSWORD`
   - JWT 密钥 `TOKEN_SECRET`（建议使用 32 位以上随机字符串）

2. **使用 HTTPS**：
   - 配置有效的 SSL 证书
   - 强制 HTTP 重定向到 HTTPS

3. **限制端口暴露**：
   - 仅暴露 Nginx 的 80/443 端口
   - 注释掉 `docker-compose.yml` 中后端和数据库的 `ports` 配置

### 性能优化

1. **调整 JVM 参数**：
   ```env
   JAVA_OPTS=-Xms2g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200
   ```

2. **数据库连接池**：
   在 `backend/src/main/resources/application-prod.yml` 中配置

3. **Nginx 缓存**：
   根据实际情况调整静态资源缓存策略

### 监控与日志

1. **日志收集**：
   ```bash
   # 定期查看日志
   docker-compose logs --tail=1000 backend > backend.log
   ```

2. **健康检查**：
   ```bash
   # 检查所有服务健康状态
   docker-compose ps
   ```

3. **资源监控**：
   ```bash
   # 查看容器资源使用情况
   docker stats
   ```

## 故障排查

### 服务无法启动

```bash
# 查看详细日志
docker-compose logs backend

# 检查容器状态
docker-compose ps

# 检查端口占用
netstat -tulpn | grep 80
```

### 数据库连接失败

```bash
# 检查数据库是否启动
docker-compose ps database

# 检查数据库日志
docker-compose logs database

# 手动测试连接
docker-compose exec backend nc -zv database 5432
```

### 前端无法访问后端 API

1. 检查 Nginx 配置是否正确
2. 检查后端服务是否启动
3. 查看 Nginx 错误日志：
   ```bash
   docker-compose logs nginx
   ```

### 清理并重建

```bash
# 停止所有服务
docker-compose down

# 删除所有镜像
docker-compose down --rmi all

# 删除数据卷（⚠️ 会删除数据）
docker-compose down -v

# 重新构建并启动
docker-compose up -d --build
```

## 开发环境

如果只想在开发环境使用 Docker 数据库：

```bash
# 只启动数据库服务
docker-compose up -d database

# 本地启动后端和前端
cd backend && ./mvnw spring-boot:run
cd frontend && npm run dev
```

## 更多信息

- 项目文档: [README.md](../README.md)
- 后端文档: [backend/README.md](../backend/README.md)
- 前端文档: [frontend/README.md](../frontend/README.md)
