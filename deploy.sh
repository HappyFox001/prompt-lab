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
# 尝试使用 docker compose build
if $DOCKER_COMPOSE build --no-cache 2>&1; then
    echo "✅ 镜像构建成功"
else
    BUILD_EXIT_CODE=$?
    echo "⚠️  Docker Compose 构建失败，尝试使用传统构建方式..."
    # 使用传统的 docker build
    if docker build --no-cache -t prompt-lab:latest .; then
        echo "✅ 使用传统方式构建成功"
        # 需要更新 docker-compose.yml 中的镜像名称
        export COMPOSE_IMAGE_NAME=prompt-lab:latest
    else
        echo "❌ 构建失败，请检查错误日志"
        exit 1
    fi
fi

# 启动容器
echo "▶️  启动容器..."
$DOCKER_COMPOSE up -d

# 显示日志
echo "📋 容器日志："
$DOCKER_COMPOSE logs -f --tail=50
