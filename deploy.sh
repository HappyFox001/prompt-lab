#!/bin/bash

# Prompt Lab 部署脚本

echo "🚀 开始部署 Prompt Lab..."

# 检测 docker-compose 命令
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "❌ 错误：未找到 docker-compose 或 docker compose 命令"
    echo "请先安装 Docker Compose："
    echo "  https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ 使用命令: $DOCKER_COMPOSE"

# 停止并移除旧容器
echo "📦 停止旧容器..."
$DOCKER_COMPOSE down

# 构建新镜像
echo "🔨 构建 Docker 镜像..."
$DOCKER_COMPOSE build --no-cache

# 启动容器
echo "▶️  启动容器..."
$DOCKER_COMPOSE up -d

# 显示日志
echo "📋 容器日志："
$DOCKER_COMPOSE logs -f --tail=50
