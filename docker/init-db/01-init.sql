-- Smart Resume 数据库初始化脚本
-- 此脚本会在数据库首次创建时自动执行
-- 注意：PostgreSQL 容器会根据 POSTGRES_DB 环境变量自动创建数据库
-- 本脚本在数据库已创建的上下文中执行

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";      -- UUID 生成函数
CREATE EXTENSION IF NOT EXISTS "pg_trgm";        -- 全文搜索（如需要）

-- 验证数据库已创建
DO $$
DECLARE
    db_name text;
BEGIN
    SELECT current_database() INTO db_name;
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Smart Resume 数据库初始化';
    RAISE NOTICE '========================================';
    RAISE NOTICE '当前数据库: %', db_name;
    RAISE NOTICE 'PostgreSQL 版本: %', version();
    RAISE NOTICE '时区设置: %', current_setting('timezone');
    RAISE NOTICE '字符编码: %', current_setting('server_encoding');
    RAISE NOTICE '已安装扩展: uuid-ossp, pg_trgm';
    RAISE NOTICE '========================================';
    RAISE NOTICE '初始化完成，等待 Flyway 执行数据库迁移...';
    RAISE NOTICE '========================================';
END $$;
