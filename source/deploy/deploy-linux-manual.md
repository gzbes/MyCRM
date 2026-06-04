# MyCRM 系统 Alibaba Cloud Linux 部署操作手册

> **目标 OS：** Alibaba Cloud Linux 4 LTS（64 位，Anolis OS 兼容）
> **推荐配置：** 2 核 CPU / 2 GB 内存 / 40 GB 磁盘
> **目标：** 从零开始，在空白 Linux 服务器上部署并运行轻量级客户订单管理系统。

---

## 目录

- [1. 环境兼容性说明](#1-环境兼容性说明)
- [2. 环境准备](#2-环境准备)
- [3. 获取代码](#3-获取代码)
- [4. 安装 MySQL 8.0 并创建数据库](#4-安装-mysql-80-并创建数据库)
- [5. 配置环境变量](#5-配置环境变量)
- [6. 安装项目依赖](#6-安装项目依赖)
- [7. 构建项目](#7-构建项目)
- [8. 启动服务](#8-启动服务)
- [9. Nginx 反向代理配置（可选但推荐）](#9-nginx-反向代理配置可选但推荐)
- [10. 验收验证](#10-验收验证)
- [11. 日常运维](#11-日常运维)
- [12. 常见问题](#12-常见问题)

---

## 1. 环境兼容性说明

### 1.1 兼容性总结

| 检查项 | 结果 | 说明 |
|--------|:----:|------|
| Node.js | **兼容** | 后端 `ES2023` target 要求 Node ≥ 20，通过 NodeSource 安装 |
| MySQL 8.0 | **兼容** | Alibaba Cloud Linux 4 可通过 MySQL 官方仓库安装 |
| 原生 C++ 编译 | **无需** | 项目 0 个 `node-gyp` 依赖，无需安装 `gcc`/`python3`/`make` |
| 内存要求 | **满足** | Node.js ≈ 150 MB + MySQL ≈ 800 MB = **< 1 GB**，2 GB 充裕 |
| 磁盘要求 | **满足** | 代码 + 依赖 ≈ 500 MB，数据库初始 < 10 MB，增长预估每年 < 100 MB |
| 端口 | **兼容** | 3000（API）和 80/443（Nginx）均为标准端口 |
| 中文字体 | **需替换** | 项目原用 Windows 专有字体 SimFang/SimHei，需安装 Linux 等效字体 |

### 1.2 资源占用预估

| 组件 | CPU | 内存 | 磁盘 |
|------|:---:|:----:|:----:|
| MySQL 8.0 | 5-10% | ~800 MB 基准 | 初始 < 10 MB |
| Node.js (NestJS) | 1-3% | ~150 MB | 代码 < 50 MB，`node_modules` ~350 MB |
| 前端静态文件 | 0% | 0 MB（Nginx 托管） | ~3 MB |
| Nginx | < 1% | ~30 MB | ~10 MB |
| **合计**（运行态） | **< 15%** | **~1 GB** | **< 500 MB**（不含数据库增长） |
| **前端构建**（临时） | 100%（短时峰值） | **+1~1.5 GB** | 临时占用 |

> **注意：** 前端构建默认执行 `vue-tsc && vite build`。`vue-tsc` TypeScript 类型检查会先消耗约 800 MB Node.js V8 堆内存，然后 `vite build`（打包全量 ECharts）再叠加，**超过 V8 默认堆上限（~1.4 GB）**，导致 `FATAL ERROR: JavaScript heap out of memory`。
>
> **解决方法：** 跳过 `vue-tsc` 直接执行 `npx vite build`（类型检查对生产构建非必需），详见 §7.2。

---

## 2. 环境准备

### 2.1 连接服务器

```bash
ssh root@你的服务器公网IP
```

### 2.2 更新系统包

```bash
dnf update -y
dnf install -y curl wget git
```

### 2.3 配置交换空间（swap）

swap 是**物理内存不足**时的应急方案。本项目前端构建的主要瓶颈是 **Node.js V8 堆内存上限**（见 §7.2），swap 无法解决该问题。但 swap 仍有以下价值：
- 防止物理内存耗尽时 OOM killer 误杀进程
- 为同时运行 MySQL + 构建 + 其他服务提供缓冲

推荐配置，尤其当服务器还运行其他服务时：

```bash
# 创建 2 GB 交换文件
fallocate -l 2G /swapfile

# 设置权限（仅 root 可读写）
chmod 600 /swapfile

# 格式化为交换空间
mkswap /swapfile

# 启用交换空间
swapon /swapfile

# 验证生效
free -h
# 预期输出中 Swap: 一行应显示 total 为 2.0G

# 写入 /etc/fstab 实现开机自动挂载
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# 验证 fstab 配置
tail -1 /etc/fstab
```

**swap 使用建议：**
- 正常运行时 swap 使用量应为 `0`（说明物理内存充足）
- 仅在前端构建期间短期内出现 swap 使用是正常的（但若构建报 `heap out of memory`，swap 帮不上忙，应使用 §7.2 的方案）

### 2.4 安装 Node.js v22 LTS

使用 NodeSource 官方仓库安装（推荐，版本可控）：

```bash
# 安装 NodeSource 仓库（Node.js v22 LTS）
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -

# 安装 Node.js
dnf install -y nodejs

# 验证
node --version   # 预期 v22.x.x
npm --version    # 预期 10.x.x
```

> **备选方案：** 如 NodeSource 镜像访问慢，可使用阿里云 NVM 镜像：
> ```bash
> # 安装 nvm
> curl -o- https://gitee.com/mirrors/nvm/raw/master/install.sh | bash
> source ~/.bashrc
>
> # 安装 Node.js v22
> nvm install 22
> nvm alias default 22
> node --version
> ```

### 2.5 安装中文字体（替代 Windows SimFang/SimHei）

项目 PDF 对账单功能需要中文字体。在 Linux 上使用 Google Noto Sans CJK 替代 Windows 字体：

```bash
# 安装 Google Noto Sans CJK 字体
dnf install -y google-noto-sans-cjk-sc-fonts

# 查找字体文件路径
fc-list | grep -i "noto.*cjk" | head -5
# 预期输出类似：/usr/share/fonts/google-noto-sans-cjk-sc/NotoSansCJKsc-Regular.otf
```

**将字体软链接到项目字体目录：**

```bash
# 创建项目字体目录
mkdir -p /data/MyCRM/source/backend/assets/fonts

# 从系统字体目录复制 Noto 字体到项目目录
cp /usr/share/fonts/google-noto-cjk/NotoSansCJKsc-Thin.otf    /data/MyCRM/source/backend/assets/fonts/
cp /usr/share/fonts/google-noto-cjk/NotoSansCJKsc-Black.otf    /data/MyCRM/source/backend/assets/fonts/
cp /usr/share/fonts/google-noto-cjk/NotoSansCJKsc-Light.otf    /data/MyCRM/source/backend/assets/fonts/
cp /usr/share/fonts/google-noto-cjk/NotoSansCJKsc-DemiLight.otf    /data/MyCRM/source/backend/assets/fonts/
cp /usr/share/fonts/google-noto-cjk/NotoSansCJKsc-Regular.otf /data/MyCRM/source/backend/assets/fonts/  
```

> **后续步骤：** 部署完成后，需修改 `reports.service.ts` 中的字体路径指向 Noto 字体（详见 §12 Q8）。

### 2.6 安装 PM2 进程管理器

```bash
npm install -g pm2
pm2 --version   # 验证安装
```

### 2.7 配置防火墙

```bash
# 查看防火墙状态
systemctl status firewalld

# 放行必要端口（如防火墙未关闭）
firewall-cmd --permanent --add-port=3000/tcp    # API 端口
firewall-cmd --permanent --add-port=80/tcp      # HTTP（如需 Nginx）
firewall-cmd --permanent --add-port=443/tcp     # HTTPS（如需）
firewall-cmd --reload
```

> **注意：** 阿里云 ECS 还需在**安全组规则**中添加相应的入方向端口，仅靠服务器防火墙不够。

---

## 3. 获取代码

### 3.1 克隆仓库

```bash
cd /data
git clone https://github.com/gzbes/MyCRM.git
cd MyCRM
```

### 3.2 查看目录结构

```bash
ls -la source/
```

确认看到以下目录：
- `backend/` — NestJS 后端
- `frontend/` — Vue3 前端

---

## 4. 安装 MySQL 8.0 并创建数据库

### 4.1 安装 MySQL 8.0

Alibaba Cloud Linux 4 基于 Anolis OS（RHEL 兼容），使用 MySQL 官方 YUM 仓库安装：

```bash
# 添加 MySQL 官方 YUM 仓库
dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm

# 导入 GPG 密钥
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023

# 安装 MySQL 8.0 社区版服务器
dnf install -y mysql-community-server
```

> **说明：** 如果 `el9` 仓库不适用，可用 `el8` 版本。Alibaba Cloud Linux 4 兼容 RHEL 8/9 软件包。

**启动 MySQL 服务：**

```bash
systemctl start mysqld
systemctl enable mysqld    # 开机自启
systemctl status mysqld    # 确认运行中
```

**获取临时 root 密码：**

```bash
grep 'temporary password' /var/log/mysqld.log
# 输出类似：A temporary password is generated for root@localhost: xxxxxxxx
```

**初始化安全配置：**

```bash
mysql_secure_installation
```

按提示操作：
1. 输入临时 root 密码
2. 设置新 root 密码（例如 `Abc@123456`，要求至少 8 位含大小写字母+数字+特殊字符）
3. 移除匿名用户 → `Y`
4. 禁止远程 root 登录 → `Y`（除非需要远程管理）
5. 移除 test 数据库 → `Y`
6. 重新加载权限表 → `Y`

### 4.2 创建数据库

```bash
mysql -u root -p
```

在 MySQL 提示符下执行：

```sql
-- 创建数据库（使用 utf8mb4 字符集以支持中文）
CREATE DATABASE IF NOT EXISTS mycrm
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

-- 查看已创建的数据库
SHOW DATABASES;

-- 退出
exit;
```

### 4.3 确认数据库连接

```bash
mysql -u root -p mycrm -e "SELECT '连接成功' AS status;"
```

> 如希望使用非 root 用户（推荐），可创建专用用户：
> ```sql
> CREATE USER 'mycrm'@'localhost' IDENTIFIED BY '你的密码';
> GRANT ALL PRIVILEGES ON mycrm.* TO 'mycrm'@'localhost';
> FLUSH PRIVILEGES;
> ```

---

## 5. 配置环境变量

### 5.1 创建 .env 文件

```bash
cd /data/MyCRM/source/backend
cp .env.example .env
```

### 5.2 编辑 .env 文件

```bash
vi .env
```

填入实际值：

```ini
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=Abc@123456          # ← 改为你第 4.1 步设置的 root 密码
DB_DATABASE=mycrm

# JWT 配置
JWT_SECRET=请替换为强随机密钥    # ← 生产环境请修改（见下方说明）
JWT_EXPIRES_IN=24h

# 应用配置
PORT=3000
```

> **生成强 JWT 密钥：**
> ```bash
> openssl rand -base64 32
> ```
> 将输出结果粘贴到 `.env` 的 `JWT_SECRET=` 后面。

### 5.3 安全设置

```bash
# .env 文件包含数据库密码，禁止被其他用户读取
chmod 600 /data/MyCRM/source/backend/.env
```

---

## 6. 安装项目依赖

### 6.1 安装后端依赖

```bash
cd /data/MyCRM/source/backend
npm install
```

安装时间约 1-3 分钟（视网络情况），国内服务器可配置 npm 镜像加速：

```bash
# 使用阿里云 npm 镜像（推荐）
npm config set registry https://registry.npmmirror.com
npm install
npx nest build
```

### 6.2 安装前端依赖

```bash
cd /data/MyCRM/source/frontend
npm run build
```

---

## 7. 构建项目

### 7.1 构建后端（TypeScript 编译）

```bash
cd /data/MyCRM/source/backend
npx nest build
```

构建成功则无错误输出，编译后的 JS 文件生成到 `dist/` 目录。

### 7.2 构建前端（生产模式）

```bash
cd /data/MyCRM/source/frontend
npm run build
```

构建成功后，静态文件生成到 `dist/` 目录。

> **常见问题：构建报 `FATAL ERROR: JavaScript heap out of memory`**
>
> **根因：** 默认构建命令 `vue-tsc && vite build` 中，`vue-tsc` 类型检查先消耗约 800 MB V8 堆内存，`vite build` 打包全量 ECharts 再叠加，**超出 Node.js V8 默认堆上限（~1.4 GB）**。
>
> **解决方法（按优先级）：**

> 1. **跳过 `vue-tsc` 类型检查（最有效，推荐）**——类型检查对生产构建非必需：
>    ```bash
>    npx vite build
>    ```
>
> 2. **扩大 V8 堆上限**——如果跳过 `vue-tsc` 后仍报 OOM，显式分配更多内存：
>    ```bash
>    NODE_OPTIONS="--max-old-space-size=1352" npx vite build
>    ```
>
> 3. **直接在前端项目的 `package.json` 中永久修改构建命令**（一劳永逸）：
>    将 `"build": "vue-tsc && vite build"` 改为 `"build": "vite build"`，后续直接 `npm run build` 即可。

> **关于 "内存不足" 的常见误区：**
> - ❌ 以为 swap 能解决：`heap out of memory` 是 V8 引擎内部的堆内存限制，swap 无法扩容 V8 堆
> - ❌ 以为停止 MySQL 有用：物理内存空余很多（实测 1319 MB 空闲），瓶颈在 V8 堆上限而非物理内存
> - ✅ 真正方案：跳过 `vue-tsc` 或增大 `--max-old-space-size`

### 7.3 验证构建产物

```bash
# 确认后端 dist 目录
ls -la /data/MyCRM/source/backend/dist/
# 应包含 main.js, app.module.js 等

# 确认前端 dist 目录
ls -la /data/MyCRM/source/frontend/dist/
# 应包含 index.html, assets/ 等
```

---

## 8. 启动服务

本系统采用**单进程部署方案**：后端 NestJS 服务同时托管 API 和前端静态页面。只需启动后端一个进程，即可通过 `http://<服务器IP>:3000` 访问完整应用。

### 8.1 使用 PM2 启动（推荐）

```bash
cd /data/MyCRM/source/backend

# 首次启动
NODE_ENV=production pm2 start dist/main.js --name mycrm-backend

# 保存进程列表（重启后自动恢复）
pm2 save
```

### 8.2 配置 PM2 开机自启

```bash
# 生成 systemd 自启服务
pm2 startup
```

执行后 PM2 会提示一条需要以 root 执行的命令，类似：

```bash
# 复制并执行 PM2 提示的命令（示例，以实际输出为准）
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u root --hp /root
```

执行完毕后，PM2 的 systemd 服务即配置完成。验证：

```bash
systemctl status pm2-root
# 应显示 active (enabled)
```

### 8.3 查看进程状态

```bash
pm2 list
pm2 show mycrm-backend
```

### 8.4 日常管理命令

```bash
pm2 restart mycrm-backend       # 重启
pm2 stop mycrm-backend          # 停止
pm2 logs mycrm-backend          # 查看实时日志
pm2 logs mycrm-backend --lines 100  # 查看最近 100 行日志
pm2 delete mycrm-backend        # 从 PM2 移除
pm2 save                        # 持久化当前进程列表
```

### 8.5 验证服务运行

```bash
# 测试 API 是否正常
curl http://localhost:3000/api
# 预期返回 JSON 响应（非 Connection refused）

# 测试前端页面是否正常
curl -s -o /dev/null -w "HTTP %{http_code}" http://localhost:3000
# 预期返回 200
```

---

## 9. Nginx 反向代理配置（可选但推荐）

生产环境建议使用 Nginx 作为反向代理，提供以下好处：
- 统一端口 80/443（用户不需记住 3000 端口）
- 支持 HTTPS（免费 Let's Encrypt 证书）
- 静态资源缓存加速
- 隐藏后端技术栈

### 9.1 安装 Nginx

```bash
dnf install -y nginx
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

### 9.2 配置反向代理

创建 Nginx 配置文件：

```bash
vi /etc/nginx/conf.d/mycrm.conf
```

写入以下配置：

```nginx
server {
    listen 80;
    server_name 8.134.171.237;  # 替换为你的域名，如 mycrm.example.com

    # 前端静态文件（可选，利用 Nginx 缓存加速）
    # 如不需要单独缓存，可直接将所有请求代理到后端 3000 端口
    # 得益于后端单进程架构，以下两段 location 二选一即可

    # ===== 方案 A：全量代理（简单，推荐）=====
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket 支持
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # 大文件上传
        client_max_body_size 20M;
    }

    # ===== 方案 B：分离托管（极致性能）=====
    # location / {
    #     root /data/MyCRM/source/frontend/dist;
    #     index index.html;
    #     try_files $uri $uri/ /index.html;
    #     expires 30d;
    #     add_header Cache-Control "public, immutable";
    # }
    #
    # location /api/ {
    #     proxy_pass http://127.0.0.1:3000;
    #     proxy_set_header Host $host;
    #     proxy_set_header X-Real-IP $remote_addr;
    #     proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    #     client_max_body_size 20M;
    # }
}
```

### 9.3 检查配置并重启

```bash
nginx -t                    # 检查配置语法
systemctl restart nginx     # 重启 Nginx
```

### 9.4 配置 HTTPS（可选，使用 Let's Encrypt）

```bash
# 安装 certbot
dnf install -y certbot python3-certbot-nginx

# 申请并自动配置证书（需要域名已解析到服务器 IP）
certbot --nginx -d mycrm.example.com

# 证书自动续期
certbot renew --dry-run
```

### 9.5 安全组配置

在阿里云 ECS 控制台 → 安全组规则中，放行以下入方向端口：
- `80/tcp` — HTTP
- `443/tcp` — HTTPS（如启用）

> 完成 Nginx 配置后，即可通过 `http://<服务器 IP>` 或 `https://<域名>` 访问系统，不再需要加 `:3000` 端口。

---

## 10. 验收验证

### 10.1 检查服务是否正常运行

```bash
# 直接验证后端 API
curl http://localhost:3000/api

# 如配置了 Nginx，也验证 Nginx 代理
curl http://localhost/api
```

### 10.2 访问前端页面

打开浏览器访问：
- **无 Nginx：** `http://<服务器公网IP>:3000`
- **有 Nginx：** `http://<服务器公网IP>` 或 `http://<你的域名>`

> **前端静态文件路径关系：** 后端代码通过以下路径加载前端构建产物：
> ```
> source/backend/src/main.ts → app.useStaticAssets(join(__dirname, '../../frontend/dist'));
> ```
> 即指向 `source/frontend/dist/`，因此必须先执行 `npm run build`。

### 10.3 登录系统

使用默认管理员账号登录：
- **邮箱：** `admin@no-crm.com`
- **密码：** `admin123`

> 首次启动后数据库为空白（0 客户、0 产品、0 订单），需要手动创建。

### 10.4 功能验证流程

登录成功后，按以下流程验证核心功能：

```
新建客户 → 新建产品 → 新建订单 → 变更订单状态 → 查看报表
```

| 模块 | 验证点 |
|------|--------|
| **客户管理** | 新增/编辑/搜索客户，名称防重校验 |
| **产品管理** | 新增/编辑/启用/停用产品，删除引用校验 |
| **订单管理** | 新建订单（明细行联动）、编辑、状态流转、附件上传 |
| **报表中心** | 4 个统计页面数据展示、CSV 导出、PDF 对账单导出 |
| **仪表盘** | 经营概览指标卡片、7 日趋势图、待处理订单列表 |

---

## 11. 日常运维

### 11.1 MySQL 运维

```bash
# 查看 MySQL 状态
systemctl status mysqld

# 重启 MySQL
systemctl restart mysqld

# 备份数据库（推荐加入 crontab 每日执行）
mysqldump -u root -p mycrm > /data/backups/mycrm_$(date +%Y%m%d).sql

# 保留最近 7 天备份，删除更早的
find /data/backups/ -name "mycrm_*.sql" -mtime +7 -delete
```

### 11.2 添加定时备份（crontab）

```bash
# 编辑 root 用户的 crontab
crontab -e
```

添加以下行：

```cron
# 每日凌晨 2:30 备份数据库，保留 7 天
30 2 * * * /usr/bin/mysqldump -u root -p'Abc@123456' mycrm > /data/backups/mycrm_$(date +\%Y\%m\%d).sql && find /data/backups/ -name "mycrm_*.sql" -mtime +7 -delete
```

> **注意：** 在 crontab 中，`%` 需要转义为 `\%`。密码直接在命令行中指定（此方法虽不安全，但在单人运维场景下可接受；更安全的方式是使用 `~/.my.cnf` 配置文件）。

**使用 `~/.my.cnf` 免密备份（更安全）：**

```bash
cat > ~/.my.cnf << 'EOF'
[mysqldump]
user=root
password=Abc@123456
EOF
chmod 600 ~/.my.cnf
```

然后 crontab 可简化为：

```cron
30 2 * * * /usr/bin/mysqldump mycrm > /data/backups/mycrm_$(date +\%Y\%m\%d).sql && find /data/backups/ -name "mycrm_*.sql" -mtime +7 -delete
```

### 11.3 PM2 运维

```bash
# 查看日志
pm2 logs mycrm-backend

# 监控资源使用
pm2 monit

# 更新代码后重启
cd /data/MyCRM
git pull
cd source/backend && npm install && npx nest build
cd ../frontend && npm install && npx vite build   # 跳过 vue-tsc 避免 OOM
pm2 restart mycrm-backend
```

### 11.4 磁盘空间检查

```bash
# 查看磁盘使用情况
df -h

# 查看 node_modules 大小（必要时可清理重装）
du -sh /data/MyCRM/source/backend/node_modules/
du -sh /data/MyCRM/source/frontend/node_modules/

# 查看上传文件大小
du -sh /data/MyCRM/source/backend/uploads/
```

### 11.5 系统资源监控

```bash
# 查看内存使用
free -h

# 查看进程
ps aux | grep -E "node|mysql|nginx"

# 查看端口监听
ss -tlnp | grep -E "3000|80|3306"
```

---

## 12. 常见问题

### Q1: 后端启动报错 `ECONNREFUSED :3306`

**原因：** MySQL 服务未启动或连接配置错误。

**解决：**
```bash
systemctl status mysqld           # 检查 MySQL 是否运行
systemctl start mysqld            # 如未运行则启动
cat /data/MyCRM/source/backend/.env  # 检查数据库密码配置
mysql -u root -p -e "SELECT 1;"   # 验证能否连接
```

### Q2: 后端启动报错 `Unknown database 'mycrm'`

**原因：** 数据库未创建。

**解决：** 执行第 4.2 节的 `CREATE DATABASE` 语句。

### Q3: 后端启动报错 `Client does not support authentication protocol`

**原因：** MySQL 8.0 默认使用 `caching_sha2_password`，而 `mysql2` 驱动可能需要 `mysql_native_password`。

**解决：**
```sql
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '你的密码';
FLUSH PRIVILEGES;
```

### Q4: MySQL 安装时报 GPG 密钥错误

**解决：**
```bash
# 手动导入 MySQL GPG 密钥
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
# 或跳过 GPG 检查（仅临时使用）
dnf install -y mysql-community-server --nogpgcheck
```

### Q5: `npx nest build` 报错找不到模块

**原因：** `package.json` 的 `dependencies` 中遗漏了某些运行时依赖（如 `@nestjs/jwt`、`class-validator`、`bcrypt` 等）。本地开发机因 `node_modules` 中残留了旧版依赖而可用，但服务器是全新安装，这些包不会被装上。

**确认方法：** 查看报错中的模块名，去 `package.json` 中搜索确认：
```bash
# 例如检查 uuid 是否在 package.json 中
grep '"uuid"' /data/MyCRM/source/backend/package.json
# 如果无输出，就是遗漏了
```

**解决：**
```bash
# 1. 先在本地开发机将缺失的包补全到 package.json 的 dependencies 中
# 2. 提交 git 并拉取到服务器
cd /data/MyCRM
git pull

# 3. 重新安装（本次会安装新增的依赖）
cd /data/MyCRM/source/backend
npm install
npx nest build
```

> **不要**简单 `rm -rf node_modules` 重试——如果 `package.json` 没补全，删了重装一样缺少这些包。

### Q6: 前端页面空白或请求 404

**原因：** 前端未构建或静态文件路径不对。

**解决：**
```bash
# 检查前端构建产物
ls -la /data/MyCRM/source/frontend/dist/
# 应存在 index.html

# 如缺失则重新构建
cd /data/MyCRM/source/frontend && npm run build

# 重启后端
pm2 restart mycrm-backend
```

### Q7: 文件上传失败（413 Request Entity Too Large）

**原因：** Nginx 默认限制上传大小为 1MB。

**解决：** 在 Nginx 配置中添加 `client_max_body_size 20M;`（见 §9.2），然后重启：
```bash
nginx -t && systemctl restart nginx
```

### Q8: PDF 对账单中文显示为空白方块

**原因：** Linux 上没有 Windows 的 SimFang/SimHei 字体。

**解决：**

**方案一：使用系统安装的 Noto 字体（推荐）**

修改 `source/backend/src/reports/reports.service.ts`，将字体路径从 `simfang.ttf` 改为 `NotoSansCJKsc-Regular.otf`：

```bash
# 编辑 reports.service.ts
vi source/backend/src/reports/reports.service.ts
```

在字体注册代码中，将：
```typescript
const fontPath = join(__dirname, '../../assets/fonts/simfang.ttf');
```
改为：
```typescript
const fontPath = join(__dirname, '../../assets/fonts/NotoSansCJKsc-Regular.otf');
```

然后重新构建并重启：
```bash
cd /data/MyCRM/source/backend && npx nest build && pm2 restart mycrm-backend
```

**方案二：直接从 Windows 复制字体（需要 Windows 机器）**

1. 从 Windows 系统的 `C:\Windows\Fonts\` 复制 `simfang.ttf` 和 `simhei.ttf`
2. 上传到服务器：
   ```bash
   # 在本地（你的 Windows 开发机）执行
   scp C:\Windows\Fonts\simfang.ttf root@服务器IP:/data/MyCRM/source/backend/assets/fonts/
   scp C:\Windows\Fonts\simhei.ttf root@服务器IP:/data/MyCRM/source/backend/assets/fonts/
   ```
3. 确认字体文件权限正确：
   ```bash
   chmod 644 /data/MyCRM/source/backend/assets/fonts/*.ttf
   ```

### Q9: `npm install` 报错 `404 Not Found - libphonenumber-js`

**原因：** npmmirror 镜像与官方 npm 仓库同步存在延迟。`package-lock.json` 中锁定的 `libphonenumber-js` 版本（如 `1.13.5`）在 npmmirror 上可能尚未同步，最高可用版本为 `1.13.4`。

**解决：**

```bash
# 方案一：使用官方 npm 仓库（推荐，国内服务器亦可正常访问）
npm config set registry https://registry.npmjs.org
npm install

# 方案二：如需继续使用 npmmirror，可在 package.json 中添加 overrides
# 手工编辑 package.json，添加以下内容：
#   "overrides": {
#     "libphonenumber-js": "1.13.4"
#   }
# 然后重新安装：
npm install
```

> `libphonenumber-js` 是 `class-validator` 的传递依赖，用于 `@IsPhoneNumber()` 校验装饰器。`1.13.4` 完全满足 `class-validator@0.14.x` 的 `^1.11.1` 版本要求。

### Q10: PM2 开机自启不生效

**原因：** `pm2 startup` 生成的脚本可能未正确执行。

**解决：**
```bash
# 确认当前进程列表已保存
pm2 save

# 重新运行 startup（会提示需执行的命令）
pm2 startup

# 检查 systemd 服务状态
systemctl status pm2-root

# 手动测试
systemctl restart pm2-root
pm2 list   # 应显示 mycrm-backend 为 online
```

### Q11: 端口被占用

**原因：** 3000 端口或其他端口已被其他进程占用。

**解决：**
```bash
# 查看端口占用
ss -tlnp | grep 3000

# 如端口被占用，可修改 .env 中的 PORT，或停用冲突进程
```

### Q12: Git pull 报错 `failed to connect to github.com`

**原因：** 服务器 DNS 问题或网络不通。

**解决：**
```bash
# 测试网络连通性
ping -c 4 github.com

# 使用镜像或代理
git config --global url."https://ghproxy.com/".insteadOf "https://github.com"
git pull
# 完成后移除代理
git config --global --unset url."https://ghproxy.com/".insteadOf
```

### Q13: 服务器重启后忘记 PM2 保存

**解决：**
```bash
# 重新启动后端进程
cd /data/MyCRM/source/backend
pm2 start dist/main.js --name mycrm-backend
pm2 save   # ← 务必执行，否则下次重启仍需手动启动
```

### Q14: 上传附件报错 "timeout of 10000ms exceeded"

**问题现象：** 在订单编辑页面上传附件（JPG/PNG/PDF），本地开发环境正常，部署到 Linux 服务器后上传失败，浏览器控制台报错 `timeout of 10000ms exceeded`。

**根因分析：**
1. 前端 axios 全局超时配置为 10 秒（`frontend/src/api/index.ts:7`）
2. 文件上传通过 Nginx 反向代理转发到后端，Nginx 代理层会增加额外的延迟
3. 较大的文件（如几 MB 的 PDF 或高分辨率图片）在服务器间传输可能超过 10 秒
4. 后端 Multer 配置的 `fileSize: 10MB` 与 Nginx 的 `client_max_body_size 20M` 均已正确设置，超时是唯一瓶颈

**修复方法（前端代码修改）：**

修改 `frontend/src/api/order.ts` 中的 `uploadAttachment()` 方法，为上传请求单独设置 60 秒超时：

```typescript
uploadAttachment(orderId: number, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<any, AttachmentData>(`/orders/${orderId}/attachments`, formData, { timeout: 60000 })
},
```

**验证：** 修改后重新构建前端并部署，上传附件应正常完成。大文件（如 5-10 MB 的 PDF）上传过程中，进度条可能停留数秒后完成，属于正常现象。

---

## 附录 A：目录结构参考

```
/data/MyCRM/
├── source/
│   ├── backend/               # NestJS 后端
│   │   ├── src/               # TypeScript 源码
│   │   ├── dist/              # 编译产物（构建后生成）
│   │   ├── assets/
│   │   │   └── fonts/         # 中文字体（Noto Sans CJK / simfang.ttf / simhei.ttf）
│   │   ├── uploads/           # 用户上传文件（订单附件）
│   │   ├── .env               # 环境配置（需手动创建，权限 600）
│   │   └── package.json
│   │
│   ├── frontend/              # Vue3 前端
│   │   ├── src/               # 源码
│   │   ├── dist/              # 构建产物
│   │   ├── node_modules/      # 前端依赖
│   │   └── package.json
│   │
│   ├── docs/                  # 项目文档（需求、计划、手册）
│   ├── UAT/                   # 验收测试文档
│   └── deploy/                # 部署手册
│
├── README.md
└── CLAUDE.md                  # 项目上下文文档

/data/backups/                 # 数据库备份目录
└── mycrm_20260604.sql         # 每日备份
```

## 附录 B：快速启动命令速查

```bash
# ===== 首次部署（从空白服务器开始）=====

# 1. 环境准备
dnf update -y
dnf install -y curl wget git
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash -
dnf install -y nodejs

# 配置交换空间（推荐，物理内存不足时的缓冲）
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

npm install -g pm2

# 2. 获取代码
mkdir -p /data
cd /data
git clone https://github.com/gzbes/MyCRM.git
cd MyCRM

# 3. 安装中文字体
dnf install -y google-noto-sans-cjk-sc-fonts
cp /usr/share/fonts/google-noto-sans-cjk-sc/NotoSansCJKsc-Regular.otf source/backend/assets/fonts/
cp /usr/share/fonts/google-noto-sans-cjk-sc/NotoSansCJKsc-Bold.otf source/backend/assets/fonts/

# 4. 安装 MySQL 8.0
dnf install -y https://dev.mysql.com/get/mysql80-community-release-el9-1.noarch.rpm
rpm --import https://repo.mysql.com/RPM-GPG-KEY-mysql-2023
dnf install -y mysql-community-server
systemctl start mysqld
systemctl enable mysqld
grep 'temporary password' /var/log/mysqld.log
# → 复制临时密码，执行 mysql_secure_installation 设置密码

# 5. 创建数据库
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS mycrm DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 6. 配置环境变量
cd source/backend
cp .env.example .env
vi .env   # 修改 DB_PASSWORD 和 JWT_SECRET
chmod 600 .env

# 7. 安装依赖 + 构建
cd source/backend && npm install && npx nest build
cd ../frontend && npm install && npx vite build   # 注意: 用 vite build 跳过 vue-tsc 避免 OOM

# 8. 启动
cd ../backend
NODE_ENV=production pm2 start dist/main.js --name mycrm-backend
pm2 save
pm2 startup   # → 按提示执行生成的命令

# 9. 验证
curl http://localhost:3000/api

# ===== 更新代码 =====
cd /data/MyCRM
git pull
cd source/backend && npm install && npx nest build
cd ../frontend && npm install && npx vite build   # 跳过 vue-tsc 避免 OOM
pm2 restart mycrm-backend

# ===== 查看日志 =====
pm2 logs mycrm-backend

# ===== 备份数据库 =====
mysqldump -u root -p mycrm > /data/backups/mycrm_$(date +%Y%m%d).sql

# ===== 访问地址 =====
# http://<服务器公网IP>:3000
# 登录：admin@no-crm.com / admin123
```

## 附录 C：阿里云 ECS 安全组配置参考

| 协议 | 端口 | 来源 | 用途 |
|:----:|:----:|:----:|:----:|
| TCP | 22 | `0.0.0.0/0` | SSH 远程连接 |
| TCP | 80 | `0.0.0.0/0` | HTTP（Nginx） |
| TCP | 443 | `0.0.0.0/0` | HTTPS（可选） |
| TCP | 3000 | `0.0.0.0/0` | 直接访问后端（如不用 Nginx） |
| TCP | 3306 | `127.0.0.1` | MySQL（仅本地监听，禁止开放公网） |

> **安全提醒：**
> - 不要将 MySQL 3306 端口开放到公网
> - 22 端口可考虑仅限公司 IP 访问（替换 `0.0.0.0/0` 为你的公网 IP）
> - 生产环境强烈建议启用 HTTPS
