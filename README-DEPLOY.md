# Prompt Lab Docker 部署指南

## 前置要求

在服务器上安装 Docker 和 Docker Compose：

```bash
# 安装 Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
newgrp docker
```

## 快速部署

### 方法 1：使用部署脚本（推荐）

```bash
# 1. 上传代码到服务器
scp -r prompt-lab ec2-user@18.182.56.215:~/

# 2. SSH 登录服务器
ssh ec2-user@18.182.56.215

# 3. 进入项目目录
cd ~/prompt-lab

# 4. 运行部署脚本
./deploy.sh
```

### 方法 2：手动部署

```bash
# 1. 构建镜像
docker-compose build

# 2. 启动容器
docker-compose up -d

# 3. 查看日志
docker-compose logs -f
```

## 常用命令

```bash
# 查看容器状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down

# 重启容器
docker-compose restart

# 进入容器
docker-compose exec prompt-lab sh

# 清理未使用的镜像
docker image prune -a
```

## 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 重新构建并启动
docker-compose up -d --build

# 或使用部署脚本
./deploy.sh
```

## 数据持久化

数据存储在 `./data` 目录中，该目录会自动挂载到容器内。
数据库文件：`./data/feedback.db`

## 端口配置

默认端口：3000
如需修改，编辑 `docker-compose.yml` 中的端口映射：

```yaml
ports:
  - "8080:3000"  # 将容器的 3000 端口映射到宿主机的 8080 端口
```

## 环境变量

可以在 `docker-compose.yml` 中添加环境变量：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - GEMINI_API_KEY=your_api_key  # 如果需要
```

## 故障排查

### 容器无法启动

```bash
# 查看详细日志
docker-compose logs

# 查看构建日志
docker-compose build --no-cache --progress=plain
```

### 端口被占用

```bash
# 检查端口占用
sudo lsof -i :3000

# 或修改 docker-compose.yml 使用其他端口
```

### 数据库权限问题

```bash
# 修复数据目录权限
sudo chown -R 1000:1000 ./data
```

## 防火墙配置（AWS EC2）

确保安全组开放 3000 端口：
1. 登录 AWS Console
2. EC2 > Security Groups
3. 添加入站规则：TCP 3000，来源 0.0.0.0/0

## 访问应用

部署完成后访问：http://18.182.56.215:3000
