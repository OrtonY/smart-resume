# Smart Resume

[English](./README.md)

Smart Resume 是一个用于创建、编辑、分享和借助 AI 优化简历的全栈项目。仓库内包含 Spring Boot 后端和 React + Vite 前端。

## 项目用途

这个项目可以理解为一个单用户的“私人简历工作室”：

- 首次启动时设置访问密码，之后通过该密码解锁工作区。
- 创建并管理多份简历。
- 在结构化编辑界面中维护简历内容，并实时预览。
- 调整模块顺序与版式布局。
- 切换内置模板，并支持创建自定义模板。
- 在浏览器中将当前简历导出为 PDF。
- 生成公开分享链接，并支持分享密码保护。
- 使用 AI 简历助手进行多轮对话，并一键应用建议。
- 基于通用质量或目标 JD 对简历进行 AI 评分。
- 发起模拟面试，并获取 AI 生成的面试报告。

## 技术栈

### 后端

- Java 21
- Spring Boot 3.5
- PostgreSQL
- Flyway
- MyBatis-Flex
- Spring AI

### 前端

- React 19
- TypeScript
- Vite
- Ant Design
- `html2canvas` + `jspdf`，用于前端侧 PDF 导出

## 项目结构

```text
smart-resume/
├── backend/   # Spring Boot API、数据库迁移、AI 服务
├── frontend/  # React 应用与简历工作区界面
└── .trellis/  # 项目流程、规范与任务记录
```

## 环境要求

启动前请先准备：

- Java 21
- Node.js 20.19+ 与 npm
- PostgreSQL

如需使用 AI 功能，还需要以下其一：

- OpenAI 兼容接口的 API Key
- DeepSeek API Key
- 或本地 Ollama 服务

## 安装步骤

### 1. 克隆仓库

```bash
git clone <your-repo-url>
cd smart-resume
```

### 2. 准备 PostgreSQL

创建名为 `smart_resume` 的数据库：

```sql
CREATE DATABASE smart_resume;
```

后端默认配置如下：

- 数据库地址：`jdbc:postgresql://localhost:5432/smart_resume`
- 数据库用户名：`postgres`
- 数据库密码：`postgres`
- 后端端口：`8080`

如果你的本地环境不同，可以通过环境变量覆盖：

```bash
export SMART_RESUME_DB_URL=jdbc:postgresql://localhost:5432/smart_resume
export SMART_RESUME_DB_USERNAME=postgres
export SMART_RESUME_DB_PASSWORD=postgres
export SMART_RESUME_BACKEND_PORT=8080
export SMART_RESUME_TOKEN_SECRET=change-this-secret
```

### 3. 安装前端依赖

```bash
cd frontend
npm install
cd ..
```

## 启动项目

请打开两个终端窗口。

### 终端 1：启动后端

```bash
cd backend
./mvnw spring-boot:run
```

启动时会自动执行 Flyway 数据库迁移。

### 终端 2：启动前端

```bash
cd frontend
npm run dev
```

然后在浏览器中打开 Vite 输出的地址，通常是 `http://localhost:5173`。

前端默认请求 `http://localhost:8080`。如果你需要改成其他地址，可以这样配置：

```bash
cd frontend
echo 'VITE_API_BASE_URL=http://localhost:8080' > .env.local
npm run dev
```

## 首次使用

当前后端与前端都启动后：

1. 在浏览器中打开前端页面。
2. 在首次进入时设置工作区密码。
3. 后续访问时使用该密码解锁。

当前项目的访问模型是单用户模式，不是多账号系统。

## AI 配置

AI 功能通过应用内的 AI 配置页面接入。后端已内置以下供应商支持：

- OpenAI 兼容接口
- DeepSeek
- Ollama

进入工作区后，可以在界面中配置 Base URL、API Key 和模型名称。

## 说明

- 公开分享页支持无密码访问，也支持密码保护。
- PDF 导出目前由前端完成，不依赖后端渲染管线。
- 仓库里已有包级文档，例如 [frontend/README.md](./frontend/README.md)，但根目录 README 才是本项目的总入口。

## 许可证

Smart Resume 基于 Apache License 2.0 开源发布。完整许可文本见 [LICENSE](./LICENSE)，归属说明见 [NOTICE](./NOTICE)。
