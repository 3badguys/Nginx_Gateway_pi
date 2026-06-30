# Nginx Gateway Local

Nginx 反向代理网关，通过子域名将请求分发到后端服务，内置 frp 内网穿透支持。

## 前置条件

- Docker
- 后端服务已加入 `shared_gateway_net` 网络

## 快速开始

```bash
# 1. 首次：创建 .env 并填入真实值
cp .env.example .env

# 2. 生成配置文件（frpc.toml、nginx.conf 等）
npm run setup

# 3. 启动
npm run start

# 4. 查看日志
npm run logs
```

> ⚠️ **顺序很重要**：必须先 `npm run setup` 再 `docker compose up`，否则 `nginx.conf` 和 `frpc.toml` 文件不存在，Docker bind mount 会把它们创建成空目录，导致容器启动失败。

## 配置

复制 `.env.example` 为 `.env`，编辑以下变量：

| 变量 | 说明 | 示例 |
|---|---|---|
| `TIMEZONE` | 时区 | `Asia/Shanghai` |
| `FRP_SERVER_ADDR` | FRP 服务器地址 | `frp.example.com` |
| `FRP_SERVER_PORT` | FRP 服务器端口 | `7000` |
| `FRP_AUTH_TOKEN` | FRP 认证令牌 | `your-token-here` |

然后运行 `npm run setup` 生成 `frpc.toml` 和 `nginx.conf`。

## 路由

采用子域名而非子路径（如 `/ha/`、`/nodered/`）的原因：每个服务的 `base_url` 不同，页面内部跳转的路径处理（重写、前缀剥离、静态资源路径等）各自不同，统一用子域名隔离可以避开这些问题，每个服务仍从 `/` 提供服务，不需改动应用本身。

通过子域名访问不同服务，所有子域名均指向同一个 FRP 服务器地址：

| 子域名 | 服务 | 后端端口 |
|--------|------|----------|
| `ha.${FRP_SERVER_ADDR}` | Home Assistant | 8123 |
| `z2m.${FRP_SERVER_ADDR}` | zigbee2mqtt | 8080 |
| `nodered.${FRP_SERVER_ADDR}` | Node-RED | 1880 |
| `esphome.${FRP_SERVER_ADDR}` | ESPHome | 6052 |

> 如需添加新服务，编辑 `nginx.conf.template` 添加一个 `server` 块：`server_name <name>.${FRP_SERVER_ADDR}`，然后重新运行 `npm run setup`。
>
> 同时确保 `host.docker.internal:<port>` 上的服务正在运行且可访问。

## 脚本

| 命令 | 说明 |
|---|---|
| `npm run setup` | 从 `.env` 生成所有 `.template` 对应的配置文件 |
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
├── .env.example             # 环境变量模板
├── .env                     # 真实配置（不提交）
├── .gitignore
├── nginx.conf.template      # Nginx 反向代理配置模板
├── nginx.conf               # 生成的 Nginx 配置（不提交）
├── logs/                    # Nginx 日志（不提交）
│   ├── access.log
│   └── error.log
├── frpc.toml.template       # FRP 配置模板
├── frpc.toml                # 生成的 FRP 配置（不提交）
├── setup.mjs                # 配置生成脚本（跨平台）
├── docker-compose.yml
├── package.json
```

## frpc 容器要改用 host 模式

在 **默认桥接模式** 下，frpc 容器内的 `127.0.0.1` 指向容器自身，比如无法连接到宿主机的 SSH 服务（`127.0.0.1:22`）。改成 **host 模式** 后，容器与宿主机共用网络栈，容器内的 `127.0.0.1` 就等于宿主机的 `127.0.0.1`，因此 frpc 配置中的 `localIP = "127.0.0.1"` 能正确工作，无需再填写宿主机的内网 IP。

使用 host 模式时，应将 `ports` 和 `networks` 字段删除或注释掉，避免误解：

- **`ports`**：host 模式直接使用宿主机网络栈，容器内监听的端口自动暴露在宿主机上，不需要也不允许通过 `ports` 做 NAT 映射。

- **`networks`**：host 模式容器不加入任何 Docker 自定义网络，因为它已经与宿主机共享网络命名空间。加入其他网络会造成网络冲突，因此 Docker Compose 会静默忽略该配置。

## 树莓派开机自动关闭 Wi-Fi 省电模式

**现象**：树莓派 Wi-Fi 时不时不稳定，连不上网络。无论怎样 `up/down wlan0` 或重启服务都无效，只有断电等待一段时间再重启才能恢复。

**原因**：Wi-Fi 模块的省电模式（Power Management）偶发性导致硬件死锁，彻底断电可复位。关闭省电模式可大幅降低触发概率。

### 设置步骤

1. 拷贝 `service服务文件` 到 `systemd` 目录：

```bash
sudo cp ./disable-wifi-powersave.service /etc/systemd/system/
```

2. 启用服务并立即生效：

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now disable-wifi-powersave.service
```

3. 验证是否成功：

```bash
iwconfig wlan0

sudo reboot
```

输出应为 `Power Management: off`。
