# Nginx Gateway Local

Nginx 反向代理网关，通过子路径分发请求到后端服务，内置 frp 内网穿透支持。

## 前置条件

- Docker
- 后端服务已加入 `shared_gateway_net` 网络

## 快速开始

```bash
# 1. 首次：创建 .env 并填入真实值
cp .env.example .env

# 2. 生成 frpc.toml
npm run setup

# 3. 启动
npm run start

# 4. 查看日志
npm run logs
```

## 配置

复制 `.env.example` 为 `.env`，编辑以下变量：

| 变量 | 说明 | 示例 |
|---|---|---|
| `FRP_SERVER_ADDR` | FRP 服务器地址 | `frp.example.com` |
| `FRP_SERVER_PORT` | FRP 服务器端口 | `7000` |
| `FRP_AUTH_TOKEN` | FRP 认证令牌 | `your-token-here` |

然后运行 `npm run setup` 生成 `frpc.toml`。

## 路由

| 路径 | 行为 |
|---|---|
| `/frpc/gfs/` | 反代到 `skateboard-frontend`，支持 Dev / Prod 切换 |
| `/` | 返回 `404 {"error": "Not Found"}` |

### `/frpc/gfs/` 环境切换

`nginx.conf` 中预留两行 `proxy_pass`，按环境注释/启用：

```nginx
# Dev — Vite HMR，不剥离前缀（Vite 开发服务器端口 5173）
proxy_pass http://skateboard-frontend:5173;

# Prod — 构建产物，剥离 /frpc/gfs/ 前缀（生产端口 80）
# proxy_pass http://skateboard-frontend:80/;
```

| 环境 | 端口 | 剥离前缀 | 说明 |
|---|---|---|---|
| Dev | `:5173` | 否 | Vite HMR 需要完整路径 |
| Prod | `:80` | 是 | 构建产物从根路径 `/` 提供服务 |

> 如需添加新路径，编辑 `nginx.conf` 添加 `location` 块。

## 脚本

| 命令 | 说明 |
|---|---|
| `npm run setup` | 从 `.env` 生成 `frpc.toml` |
| `npm run start` | 启动所有服务 |
| `npm run stop` | 停止所有服务 |
| `npm run restart` | 重启所有服务 |
| `npm run logs` | 查看日志 |

## 关闭 FRP 穿透

不需要内网穿透时：

```bash
docker compose up -d nginx-gateway     # 仅启动 nginx
```

或者直接注释/删除 `docker-compose.yml` 中的 `frpc` 服务。

## 文件结构

```
├── .env.example          # 环境变量模板
├── .env                  # 真实配置（不提交）
├── .gitignore
├── nginx.conf            # Nginx 反向代理配置
├── logs/                 # Nginx 日志（不提交）
│   ├── access.log
│   └── error.log
├── frpc.toml.template    # FRP 配置模板
├── frpc.toml             # 生成的 FRP 配置（不提交）
├── setup.mjs             # 配置生成脚本（跨平台）
├── docker-compose.yml
├── package.json
```

## frpc 容器要改用 host 模式

在 **默认桥接模式** 下，frpc 容器内的 `127.0.0.1` 指向容器自身，比如无法连接到宿主机的 SSH 服务（`127.0.0.1:22`）。改成 **host 模式** 后，容器与宿主机共用网络栈，容器内的 `127.0.0.1` 就等于宿主机的 `127.0.0.1`，因此 frpc 配置中的 `localIP = "127.0.0.1"` 能正确工作，无需再填写宿主机的内网 IP。

使用 host 模式时，应将 `ports` 和 `networks` 字段删除或注释掉，避免误解：

- **`ports`**：host 模式直接使用宿主机网络栈，容器内监听的端口自动暴露在宿主机上，不需要也不允许通过 `ports` 做 NAT 映射。

- **`networks`**：host 模式容器不加入任何 Docker 自定义网络，因为它已经与宿主机共享网络命名空间。加入其他网络会造成网络冲突，因此 Docker Compose 会静默忽略该配置。
