#!/bin/bash

# 数据库初始化验证脚本

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 函数：打印信息
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# 加载环境变量
if [ -f .env ]; then
    source .env
else
    print_warning ".env 文件不存在，使用默认值"
fi

DB_NAME=${DB_NAME:-smart_resume}
DB_USER=${DB_USER:-postgres}
DB_PORT=${DB_PORT:-5432}

print_info "========================================"
print_info "数据库初始化验证"
print_info "========================================"
echo ""

# 检查容器是否运行
print_info "检查容器状态..."
if ! docker-compose ps database | grep -q "Up"; then
    print_error "数据库容器未运行"
    print_info "尝试启动: docker-compose up -d database"
    exit 1
fi
print_success "数据库容器正在运行"

# 检查数据库连接
print_info "检查数据库连接..."
if ! docker-compose exec -T database pg_isready -U $DB_USER > /dev/null 2>&1; then
    print_error "无法连接到数据库"
    exit 1
fi
print_success "数据库连接正常"

# 检查数据库是否存在
print_info "检查数据库 '$DB_NAME' 是否存在..."
DB_EXISTS=$(docker-compose exec -T database psql -U $DB_USER -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" 2>/dev/null || echo "")
if [ "$DB_EXISTS" = "1" ]; then
    print_success "数据库 '$DB_NAME' 已创建"
else
    print_error "数据库 '$DB_NAME' 不存在"
    print_info "这不应该发生，请检查 POSTGRES_DB 环境变量"
    exit 1
fi

# 检查扩展
print_info "检查数据库扩展..."
EXTENSIONS=$(docker-compose exec -T database psql -U $DB_USER -d $DB_NAME -tAc "SELECT extname FROM pg_extension WHERE extname IN ('uuid-ossp', 'pg_trgm')" 2>/dev/null | tr '\n' ' ')
if [[ $EXTENSIONS == *"uuid-ossp"* ]]; then
    print_success "扩展 uuid-ossp 已安装"
else
    print_warning "扩展 uuid-ossp 未安装"
fi

if [[ $EXTENSIONS == *"pg_trgm"* ]]; then
    print_success "扩展 pg_trgm 已安装"
else
    print_warning "扩展 pg_trgm 未安装（可选）"
fi

# 检查时区设置
print_info "检查时区设置..."
TIMEZONE=$(docker-compose exec -T database psql -U $DB_USER -d $DB_NAME -tAc "SHOW timezone" 2>/dev/null | tr -d '[:space:]')
print_success "时区: $TIMEZONE"

# 检查数据库版本
print_info "检查 PostgreSQL 版本..."
PG_VERSION=$(docker-compose exec -T database psql -U $DB_USER -tAc "SELECT version()" 2>/dev/null | head -n 1)
print_success "$PG_VERSION"

# 检查表是否已创建（Flyway 迁移）
print_info "检查数据库表..."
TABLE_COUNT=$(docker-compose exec -T database psql -U $DB_USER -d $DB_NAME -tAc "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public'" 2>/dev/null || echo "0")
if [ "$TABLE_COUNT" -gt 0 ]; then
    print_success "已创建 $TABLE_COUNT 张表"

    # 列出所有表
    echo ""
    print_info "数据库表列表："
    docker-compose exec -T database psql -U $DB_USER -d $DB_NAME -c "\dt" 2>/dev/null || true
else
    print_warning "未发现任何表"
    print_info "如果后端还未启动，这是正常的。表结构由 Flyway 在后端启动时创建。"
fi

echo ""
print_info "========================================"
print_success "数据库验证完成！"
print_info "========================================"
echo ""

# 连接信息
print_info "数据库连接信息："
echo "  Host: localhost"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  Username: $DB_USER"
echo ""
print_info "使用以下命令连接数据库："
echo "  docker-compose exec database psql -U $DB_USER -d $DB_NAME"
echo ""
