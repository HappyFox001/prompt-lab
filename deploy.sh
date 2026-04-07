#!/bin/bash

# Prompt Lab 部署脚本

echo "🚀 开始部署 Prompt Lab..."

# 停止并移除旧容器
echo "📦 停止旧容器..."
docker-compose down

# 构建新镜像
echo "🔨 构建 Docker 镜像..."
docker-compose build --no-cache

# 启动容器
echo "▶️  启动容器..."
docker-compose up -d

# 显示日志
echo "📋 容器日志："
docker-compose logs -f --tail=50
