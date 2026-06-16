# Docker 部署检查清单

部署前和部署后的完整检查清单，确保配置正确。

## ✅ 部署前检查

### 环境要求

- [ ] Docker 已安装（版本 >= 20.10）
- [ ] Docker Compose 已安装（版本 >= 2.0）
- [ ] 服务器有足够的资源：
  - [ ] CPU: 至少 2 核心
  - [ ] 内存: 至少 4GB（推荐 8GB）
  - [ ] 磁盘: 至少 10GB 可用空间

验证命令：
```bash
docker --version
docker compose version
free -h
df -h
```

### 配置文件

- [ ] 已创建 `.env` 文件（从 `.env.example` 复制）
- [ ] 已修改 `DB_PASSWORD`（生产环境必须）
- [ ] 已修改 `TOKEN_SECRET`（生产环境必须，建议 32 位以上）
- [ ] 已检查端口配置（确保不冲突）
  - [ ] `NGINX_HTTP_PORT` (默认 80)
  - [ ] `BACKEND_PORT` (默认 8080)
  - [ ] `DB_PORT` (默认 5432)

检查端口占用：
```bash
netstat -tulpn | grep -E '80|8080|5432'
```

### 安全配置（生产环境）

- [ ] 数据库密码强度足够（至少 16 位，包含大小写字母、数字、特殊字符）
- [ ] JWT Token 密钥随机且足够长
- [ ] 准备 SSL 证书（如需 HTTPS）
- [ ] 计划移除数据库和后端的端口暴露（仅暴露 Nginx）

生成强密码示例：
```bash
# 生成 32 位随机密码
openssl rand -base64 32

# 生成 JWT Token 密钥（64 位）
openssl rand -base64 64 | tr -d '\n'
```

### 文件准备

- [ ] 所有 Docker 配置文件存在：
  - [ ] `docker-compose.yml`
  - [ ] `backend/Dockerfile`
  - [ ] `frontend/Dockerfile`
  - [ ] `docker/nginx/nginx.conf`
  - [ ] `docker/nginx/conf.d/default.conf`
  - [ ] `docker/init-db/01-init.sql`

验证文件：
```bash
ls -l docker-compose.yml backend/Dockerfile frontend/Dockerfile
ls -l docker/nginx/nginx.conf docker/nginx/conf.d/default.conf
ls -l docker/init-db/01-init.sql
```

## 🚀 部署步骤

### 方式一：自动化部署（推荐）

```bash
./deploy.sh
```

### 方式二：手动部署

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动服务
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

## ✅ 部署后检查

### 服务状态

- [ ] 所有容器都在运行
- [ ] 所有容器健康检查通过

检查命令：
```bash
docker-compose ps

# 预期输出示例：
# NAME                   STATUS              PORTS
# smart-resume-db        Up (healthy)        0.0.0.0:5432->5432/tcp
# smart-resume-backend   Up (healthy)        0.0.0.0:8080->8080/tcp
# smart-resume-frontend  Up (healthy)        
# smart-resume-nginx     Up (healthy)        0.0.0.0:80->80/tcp
```

### 数据库验证

- [ ] 数据库容器健康
- [ ] 数据库已创建
- [ ] 扩展已安装
- [ ] 表结构已迁移

验证命令：
```bash
./verify-db.sh

# 或手动检查
docker-compose exec database psql -U postgres -d smart_resume -c "\dt"
```

### 后端服务验证

- [ ] 后端容器启动成功
- [ ] 后端能连接数据库
- [ ] Flyway 迁移成功
- [ ] API 健康检查通过

验证命令：
```bash
# 查看后端日志
docker-compose logs backend | tail -50

# 测试健康检查接口
curl http://localhost:8080/api/health

# 或通过 Nginx 代理
curl http://localhost/api/health
```

预期响应：`{"status":"UP"}` 或类似内容

### 前端服务验证

- [ ] 前端容器启动成功
- [ ] 静态文件已构建
- [ ] Nginx 能正确托管

验证命令：
```bash
# 查看前端日志
docker-compose logs frontend

# 测试首页访问
curl -I http://localhost

# 预期响应：HTTP/1.1 200 OK
```

### Nginx 验证

- [ ] Nginx 配置语法正确
- [ ] 反向代理工作正常
- [ ] 静态资源缓存配置生效

验证命令：
```bash
# 测试 Nginx 配置
docker-compose exec nginx nginx -t

# 测试反向代理
curl http://localhost/api/health

# 检查响应头（缓存策略）
curl -I http://localhost/
```

### 网络连通性

- [ ] Nginx 能访问前端服务
- [ ] Nginx 能访问后端服务
- [ ] 后端能访问数据库

验证命令：
```bash
# Nginx 到后端
docker-compose exec nginx nc -zv backend 8080

# Nginx 到前端
docker-compose exec nginx nc -zv frontend 80

# 后端到数据库
docker-compose exec backend nc -zv database 5432
```

### 功能测试

- [ ] 能打开前端页面
- [ ] 能注册新用户
- [ ] 能登录系统
- [ ] 能创建简历
- [ ] API 请求无跨域错误

浏览器测试：
```
访问：http://localhost
打开浏览器开发者工具（F12）
检查 Console 是否有错误
检查 Network 选项卡的 API 请求
```

## ✅ 生产环境额外检查

### 安全加固

- [ ] 已修改所有默认密码
- [ ] 已配置 HTTPS（生产环境必须）
- [ ] 已移除不必要的端口暴露
  ```yaml
  # docker-compose.yml 中注释掉：
  # backend:
  #   ports:
  #     - "${BACKEND_PORT:-8080}:8080"  # 注释掉
  # database:
  #   ports:
  #     - "${DB_PORT:-5432}:5432"       # 注释掉
  ```
- [ ] 已配置防火墙规则
- [ ] 已启用安全响应头（已在 Nginx 配置中）

### 性能优化

- [ ] 已根据服务器资源调整 JVM 参数
  ```env
  # .env 文件
  JAVA_OPTS=-Xms2g -Xmx4g -XX:+UseG1GC
  ```
- [ ] 已配置 Docker 资源限制（可选）
- [ ] 已测试负载能力

### 监控和日志

- [ ] 已配置日志收集方案
- [ ] 已配置监控告警（推荐工具：Prometheus + Grafana）
- [ ] 已设置磁盘空间监控（防止日志占满磁盘）

### 备份策略

- [ ] 已配置数据库自动备份
  ```bash
  # 示例：每天凌晨 2 点备份
  0 2 * * * cd /path/to/smart-resume && docker-compose exec -T database pg_dump -U postgres smart_resume > /backup/smart_resume_$(date +\%Y\%m\%d).sql
  ```
- [ ] 已测试备份恢复流程
- [ ] 已配置备份文件清理策略（防止占满磁盘）

### 容灾准备

- [ ] 已文档化部署流程
- [ ] 已保存完整的 `.env` 配置（安全存储）
- [ ] 已测试从零重建流程
- [ ] 已准备回滚方案

## 🔍 常见问题排查

### 问题：容器无法启动

检查步骤：
```bash
# 1. 查看详细日志
docker-compose logs <service_name>

# 2. 检查容器状态
docker-compose ps

# 3. 检查配置文件语法
docker-compose config
```

### 问题：端口被占用

检查步骤：
```bash
# 查看端口占用
netstat -tulpn | grep <port>

# 修改 .env 文件中的端口配置
vim .env

# 重启服务
docker-compose up -d
```

### 问题：数据库连接失败

检查步骤：
```bash
# 1. 确认数据库容器健康
docker-compose ps database

# 2. 查看数据库日志
docker-compose logs database

# 3. 手动测试连接
docker-compose exec database psql -U postgres -d smart_resume

# 4. 从后端容器测试连接
docker-compose exec backend nc -zv database 5432
```

### 问题：前端无法访问后端 API

检查步骤：
```bash
# 1. 检查后端是否启动
docker-compose ps backend

# 2. 测试后端 API
curl http://localhost:8080/api/health

# 3. 测试 Nginx 代理
curl http://localhost/api/health

# 4. 查看 Nginx 错误日志
docker-compose logs nginx
```

## 📋 检查清单总结

### 最小化部署检查（开发环境）
✅ 必须完成的项目：
- Docker 环境安装
- 创建 `.env` 文件
- 所有容器启动成功
- 能访问前端页面
- API 请求正常

### 完整部署检查（生产环境）
✅ 必须完成的项目：
- 所有"部署前检查"
- 所有"部署后检查"
- 所有"生产环境额外检查"
- 功能测试通过
- 性能测试通过
- 备份恢复测试通过

## 🎉 部署成功确认

当以下所有条件满足时，可以认为部署成功：

- ✅ 所有容器运行且健康检查通过
- ✅ 能通过浏览器访问前端应用
- ✅ 能成功注册和登录用户
- ✅ API 请求无跨域错误
- ✅ 数据库验证脚本通过
- ✅ 日志无严重错误

```bash
# 一键验证部署状态
docker-compose ps && \
curl -f http://localhost/api/health && \
./verify-db.sh && \
echo "✅ 部署验证通过！"
```

## 📞 获取帮助

如果检查清单中的某些项目失败：

1. 查看对应服务的日志：`docker-compose logs <service>`
2. 参考 [FAQ 文档](FAQ.md) 寻找解决方案
3. 参考 [部署指南](README.md) 获取详细说明
4. 提交 Issue 到项目仓库，附上详细的错误信息和日志

---

**建议**：将此检查清单打印或保存，在每次部署时逐项检查，确保不遗漏重要步骤。
