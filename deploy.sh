#!/bin/bash

# Smart Resume Docker 部署脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 函数：打印信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi

    print_info "Docker 环境检查通过"
}

# 检查 .env 文件
check_env_file() {
    if [ ! -f .env ]; then
        print_warning ".env 文件不存在，从 .env.example 创建"
        cp .env.example .env
        print_warning "请编辑 .env 文件并修改必要的配置项（尤其是生产环境的密码和密钥）"
        print_info "配置文件路径: .env"
        read -p "是否现在编辑配置文件? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            ${EDITOR:-vim} .env
        else
            print_warning "请手动编辑 .env 文件后再次运行部署脚本"
            exit 0
        fi
    else
        print_info ".env 文件已存在"
    fi
}

# 检查端口占用
check_ports() {
    source .env 2>/dev/null || true

    local ports=(${NGINX_HTTP_PORT:-80} ${BACKEND_PORT:-8080} ${DB_PORT:-5432})
    local port_names=("Nginx HTTP" "Backend" "Database")

    for i in "${!ports[@]}"; do
        local port=${ports[$i]}
        local name=${port_names[$i]}

        if netstat -tuln 2>/dev/null | grep -q ":${port} " || lsof -i :${port} &>/dev/null; then
            print_warning "端口 ${port} (${name}) 已被占用"
            read -p "是否继续? (y/n) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                print_info "请修改 .env 文件中的端口配置后重试"
                exit 1
            fi
        fi
    done
}

# 构建并启动服务
start_services() {
    print_info "开始构建 Docker 镜像..."
    docker-compose build

    print_info "启动服务..."
    docker-compose up -d

    print_info "等待服务启动..."
    sleep 10

    print_info "检查服务状态..."
    docker-compose ps
}

# 显示访问信息
show_access_info() {
    source .env 2>/dev/null || true

    local http_port=${NGINX_HTTP_PORT:-80}

    echo ""
    print_info "========================================"
    print_info "Smart Resume 部署成功！"
    print_info "========================================"
    echo ""
    print_info "访问地址:"
    print_info "  前端应用: http://localhost:${http_port}"
    print_info "  后端 API: http://localhost:${http_port}/api"
    echo ""
    print_info "数据库连接信息:"
    print_info "  Host: localhost"
    print_info "  Port: ${DB_PORT:-5432}"
    print_info "  Database: ${DB_NAME:-smart_resume}"
    print_info "  Username: ${DB_USER:-postgres}"
    echo ""
    print_info "常用命令:"
    print_info "  查看日志: docker-compose logs -f"
    print_info "  停止服务: docker-compose stop"
    print_info "  重启服务: docker-compose restart"
    print_info "  删除服务: docker-compose down"
    echo ""
}

# 主流程
main() {
    print_info "开始部署 Smart Resume..."

    check_docker
    check_env_file
    check_ports
    start_services
    show_access_info

    print_info "部署完成！"
}

# 执行主流程
main
