# Docker 部署文件说明

本文档说明所有 Docker 相关文件的作用和关系。

## 📁 文件结构

```
.
├── docker-compose.yml              # 生产环境 Docker Compose 配置
├── docker-compose.dev.yml          # 开发环境配置（仅数据库）
├── .env.example                    # 环境变量配置模板
├── deploy.sh                       # 自动化部署脚本
├── verify-db.sh                    # 数据库验证脚本
│
├── backend/
│   └── Dockerfile                  # 后端服务镜像构建文件
│
├── frontend/
│   └── Dockerfile                  # 前端服务镜像构建文件
│
└── docker/
    ├── README.md                   # 部署指南（主文档）
    ├── FAQ.md                      # 常见问题解答
    ├── FILES.md                    # 本文件
    ├── .gitignore                  # Docker 相关忽略文件
    │
    ├── nginx/
    │   ├── nginx.conf              # Nginx 主配置
    │   ├── docker-entrypoint.d/
    │   │   └── 10-select-templates.sh # 按 ENABLE_HTTPS 选择模板
    │   ├── optional-templates/
    │   │   └── https.conf.template # HTTPS 配置模板（按需启用）
    │   ├── snippets/
    │   │   └── proxy-locations.conf # HTTP/HTTPS 共用代理规则
    │   ├── templates/
    │   │   ├── 00-upstreams.conf.template # 上游服务配置模板
    │   │   └── default.conf.template # HTTP 站点配置模板
    │   └── ssl/                    # SSL 证书目录（需自行放置）
    │
    └── init-db/
        └── 01-init.sql             # 数据库初始化脚本
```

## 📄 核心文件详解

### docker-compose.yml

**作用**：生产环境完整配置，定义所有服务及其依赖关系。

**包含服务**：
- `database` - PostgreSQL 17.6 数据库
- `backend` - Spring Boot 3 + JDK 21 后端
- `frontend` - React + Node 20 前端
- `nginx` - 反向代理服务器

**关键特性**：
- 服务依赖和启动顺序控制
- 健康检查配置
- 数据持久化（Docker 卷）
- 网络隔离
- 环境变量注入

**修改场景**：
- 添加新服务（如 Redis、Elasticsearch）
- 调整服务依赖关系
- 修改资源限制

### .env.example

**作用**：环境变量配置模板，所有可配置项的说明文档。

**包含配置**：
- 数据库连接信息
- 后端服务配置
- 前端构建参数
- Nginx 端口配置
- JVM 参数

**使用方法**：
```bash
cp .env.example .env
vim .env  # 修改配置
```

**注意事项**：
- `.env` 文件不应提交到 Git（已在 `.gitignore` 中）
- 生产环境必须修改密码和密钥
- 端口冲突时修改端口配置

### backend/Dockerfile

**作用**：后端服务 Docker 镜像构建文件。

**构建策略**：
- **第一阶段**（builder）：使用 Maven + JDK 21 编译项目
- **第二阶段**（runtime）：使用 JRE 21 运行 JAR 包

**优化特性**：
- 多阶段构建减小镜像体积
- 利用 Docker 缓存层加速构建
- 非 root 用户运行提升安全性
- 内置健康检查

**修改场景**：
- 切换 JDK 版本
- 添加 APM 监控（如 Skywalking）
- 修改 JVM 启动参数
- 添加时区、字体等系统依赖

### frontend/Dockerfile

**作用**：前端服务 Docker 镜像构建文件。

**构建策略**：
- **第一阶段**（builder）：使用 Node 20 构建 React 应用
- **第二阶段**（runtime）：使用 Nginx 托管静态文件

**优化特性**：
- 多阶段构建减小镜像体积
- 内置 Nginx 配置（SPA 路由支持）
- 静态资源缓存优化
- Gzip 压缩

**修改场景**：
- 切换 Node 版本
- 修改构建命令
- 添加环境变量
- 调整 Nginx 配置

### docker/nginx/nginx.conf

**作用**：Nginx 主配置文件，定义全局设置。

**主要配置**：
- Worker 进程数
- 日志格式和路径
- Gzip 压缩
- 连接超时
- 文件上传大小限制

**修改场景**：
- 性能调优（worker 数量、连接数）
- 修改日志格式
- 调整压缩策略
- 修改上传大小限制

### docker/nginx/templates/*.template

**作用**：Nginx 基础配置模板，定义上游服务和 HTTP 站点，并通过 `.env` 中的 `APP_DOMAIN` 渲染 `server_name`。

**核心功能**：
- 上游服务配置（backend/frontend）
- HTTP `server` 配置
- 通过片段复用代理规则

### docker/nginx/optional-templates/https.conf.template

**作用**：HTTPS 配置模板。仅当 `.env` 中 `ENABLE_HTTPS=true` 时由启动脚本复制并渲染。

**核心功能**：
- 启用 443 SSL 监听
- 使用 `docker/nginx/ssl/cert.pem` 和 `key.pem`
- 复用 HTTP 相同的代理规则

**代理规则**：
```
用户请求 http://localhost/api/users
         ↓
Nginx 反向代理
         ↓
后端服务 http://backend:8080/api/users
```

**修改场景**：
- 启用 HTTPS
- 修改缓存策略
- 添加新的代理路径
- 调整超时时间
- 添加访问控制

### docker/init-db/01-init.sql

**作用**：数据库首次启动时执行的初始化脚本。

**执行时机**：
- PostgreSQL 容器首次创建数据库后
- 仅执行一次（数据卷存在时不再执行）

**当前功能**：
- 设置时区为 Asia/Shanghai
- 创建 UUID 扩展
- 创建全文搜索扩展（pg_trgm）
- 输出初始化日志

**修改场景**：
- 添加更多扩展
- 创建初始数据
- 设置数据库参数
- 创建其他数据库用户

**注意事项**：
- 数据库名由 `POSTGRES_DB` 环境变量指定，无需在脚本中创建
- 表结构由 Flyway 在后端启动时创建，不要在此脚本中创建

## 🔧 辅助脚本

### deploy.sh

**作用**：自动化部署脚本，简化部署流程。

**功能**：
- 检查 Docker 环境
- 检查/创建 .env 文件
- 检测端口冲突
- 构建并启动服务
- 显示访问信息

**使用方法**：
```bash
chmod +x deploy.sh
./deploy.sh
```

**适用场景**：
- 首次部署
- 快速部署到新环境
- 自动化 CI/CD

### verify-db.sh

**作用**：验证数据库初始化状态。

**检查项目**：
- 容器运行状态
- 数据库连接
- 数据库是否创建
- 扩展是否安装
- 时区配置
- PostgreSQL 版本
- 表结构（Flyway 迁移）

**使用方法**：
```bash
chmod +x verify-db.sh
./verify-db.sh
```

**适用场景**：
- 部署后验证
- 排查数据库问题
- 检查迁移状态

## 📚 文档文件

### docker/README.md

**作用**：Docker 部署主文档。

**内容**：
- 快速开始指南
- 环境配置说明
- 常用命令参考
- 高级配置（HTTPS、JVM 调优等）
- 生产环境部署建议
- 故障排查指南

**目标读者**：所有需要部署项目的用户。

### docker/FAQ.md

**作用**：常见问题解答。

**内容**：
- 数据库相关问题（初始化、备份、恢复）
- 后端相关问题（启动失败、JVM 调优）
- 前端相关问题（API 连接、构建配置）
- Nginx 相关问题（HTTPS、配置修改）
- 端口冲突解决方案
- 性能优化建议
- 开发调试技巧
- 生产环境检查清单

**目标读者**：遇到问题需要排查的用户。

### docker/FILES.md

**作用**：本文件，说明所有 Docker 相关文件的作用。

**目标读者**：
- 需要了解项目结构的开发者
- 需要修改配置的运维人员
- 需要定制部署的用户

## 🔄 文件依赖关系

```
docker-compose.yml
├── 读取 .env 环境变量
├── 构建 backend/Dockerfile
├── 构建 frontend/Dockerfile
├── 挂载 docker/nginx/nginx.conf
├── 挂载 docker/nginx/docker-entrypoint.d/10-select-templates.sh
├── 挂载 docker/nginx/templates/*.template
├── 挂载 docker/nginx/optional-templates/*.template
├── 挂载 docker/nginx/snippets/*.conf
└── 挂载 docker/init-db/*.sql

deploy.sh
├── 检查 Docker 环境
├── 生成 .env（从 .env.example）
└── 执行 docker-compose up

verify-db.sh
├── 读取 .env 环境变量
└── 通过 docker-compose exec 验证数据库
```

## 🎯 常见修改场景速查

### 修改数据库配置
- 编辑 `.env` 文件
- 重启：`docker-compose restart database`

### 修改后端代码
- 修改代码后重新构建：`docker-compose build backend`
- 重启：`docker-compose up -d backend`

### 修改前端代码
- 修改代码后重新构建：`docker-compose build frontend`
- 重启：`docker-compose up -d frontend`

### 修改 Nginx 配置
- 编辑 `docker/nginx/templates/default.conf.template`、`docker/nginx/optional-templates/https.conf.template` 或 `docker/nginx/snippets/proxy-locations.conf`
- 重建 Nginx 容器以重新渲染模板：`docker-compose up -d --force-recreate nginx`
- 测试：`docker-compose exec nginx nginx -t`

### 添加数据库扩展
- 编辑 `docker/init-db/01-init.sql`
- 删除数据卷并重建：`docker-compose down -v && docker-compose up -d`

### 调整 JVM 参数
- 编辑 `.env` 中的 `JAVA_OPTS`
- 重启：`docker-compose restart backend`

### 启用 HTTPS
1. 准备证书放到 `docker/nginx/ssl/`
2. 编辑 `.env` 设置 `ENABLE_HTTPS=true`，按需设置 `NGINX_HTTPS_PORT=443`
3. 重建 Nginx 容器：`docker-compose up -d --force-recreate nginx`

## 📖 学习路径建议

### 新手用户
1. 阅读 `docker/README.md` 快速开始部分
2. 运行 `./deploy.sh` 自动化部署
3. 运行 `./verify-db.sh` 验证部署
4. 遇到问题查看 `docker/FAQ.md`

### 进阶用户
1. 理解 `docker-compose.yml` 的服务定义
2. 学习 `.env` 环境变量配置
3. 了解 Dockerfile 多阶段构建
4. 掌握 Nginx 反向代理配置

### 运维人员
1. 学习生产环境部署建议
2. 掌握备份恢复流程
3. 了解性能优化方案
4. 配置监控和日志收集

### 开发人员
1. 使用 `docker-compose.dev.yml` 开发
2. 理解服务间通信机制
3. 学习如何调试容器内应用
4. 掌握如何修改构建流程

## 🆘 获取帮助

遇到问题时的解决流程：

1. **查看日志**：`docker-compose logs -f`
2. **检查状态**：`docker-compose ps`
3. **运行验证**：`./verify-db.sh`
4. **查阅文档**：
   - 部署问题 → `docker/README.md`
   - 常见问题 → `docker/FAQ.md`
   - 文件说明 → `docker/FILES.md`（本文件）
5. **提交 Issue**：到项目仓库提交详细的错误信息

## 🔗 相关资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [PostgreSQL 官方镜像](https://hub.docker.com/_/postgres)
- [Nginx 官方镜像](https://hub.docker.com/_/nginx)
- [Spring Boot Docker 指南](https://spring.io/guides/gs/spring-boot-docker/)
