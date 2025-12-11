# 💸 BNB & BEP20 转账监控 Discord 机器人

一款强大的 Discord 机器人，专为 **币安智能链 (BSC)** 和 **opBNB** 设计，用于实时监控链上交易和 **BEP20 代币转账**事件，并将警报即时发送到配置的 Discord 频道。

它使用 [Ethers.js](https://docs.ethers.org/v6/) 监听两种关键交易类型：
1. **原生代币转账**：监控 BSC/opBNB 链上的 **BNB** 交易。
2. **BEP20 代币转账**：监控通过代币合约发出的 `Transfer` 事件。

所有警报即时推送至 Discord，并且所有已处理的交易可以记录到本地 CSV 文件中（可选）。

---

## 💡 主要特性 (Features)

* **双链支持**：同时监控 **BSC** 和 **opBNB** 网络。
* **实时警报**：将监控到的交易即时推送到指定的 Discord 文本频道。
* **多合约监控**: 可配置监控多个BEP-20合约。
* **灵活过滤器**：支持通过地址（`froms`, `tos`）或最小金额（`min_value`）来过滤 BNB 和 BEP-20 代币转账。
* **可选日志**：支持将所有警报交易记录到本地 CSV 文件中。

---

## 🛠️ 前提条件 (Prerequisites)

您需要准备以下环境和凭证：

* **Node.js**：版本 **18 或更高**（推荐使用 LTS）。
* **npm 或 Yarn**：Node.js 包管理器。
* **稳定的 WebSocket RPC URL**：
    * 您需要获取 BSC 和 opBNB 网络的稳定、私有 **WebSocket (WSS)** 端点。
    * **重要提示**：公共端点通常不可靠，不适合持续监控。建议使用 [Infura](https://infura.io/)、[Alchemy](https://www.alchemy.com/)、[QuickNode](https://www.quicknode.com/) 等平台的专业 WSS 服务。
* **Discord 机器人 Token**：您的 Discord 应用机器人的 Token。
    * 参考：[Discord 开发者入门指南](https://discordjs.guide/legacy/preparations/app-setup)。
* **Discord 频道 ID**：用于发送警报的特定**文本频道** ID。

---

## 🚀 安装与配置 (Installation & Setup)

### 1. 安装全局依赖

全局安装 `typescript` 和 `tsx` 以支持项目运行：

```bash
npm install -g typescript
npm install -g tsx
```

### 2\. 克隆项目

克隆代码库并进入项目目录：

```bash
git clone https://github.com/web3cli/example-hub.git
cd example-hub/typescript/discord-bot
```

### 3\. 安装项目依赖

```bash
npm install
```

### 4\. 配置 `config.ts`

使用您的环境信息更新 `config.ts` 文件中的设置：

  * **Discord 凭证**：
      * 设置 `discord.bot_token` 和 `discord.channel_id`。
  * **RPC 端点**：
      * 设置 `bsc.rpc_wss_url` 和 `opbnb.rpc_wss_url` (必须是 WebSocket 类型)。
  * **BEP20合约及监控过滤器**：设置 `bsc.contracts` 和 `opbnb.contracts`, 定义合约地址及详细的监控规则。

| 监控对象 | 配置路径 | 过滤规则 |
| :--- | :--- | :--- |
| **原生代币 (BNB)** | `bsc.bnb` / `opbnb.bnb` | 通过地址 (`froms`, `tos`) 或最小金额 (`min_value`) 过滤。 |
| **BEP20 代币** | `bsc.contracts` / `opbnb.contracts` | 包含代币地址 (`address`) 和相应的过滤规则 (`froms`, `tos`, `min_value`)，用于 `Transfer` 事件。 |

-----

## ▶️ 运行项目 (Running the Project)

使用以下命令来运行、编译和管理项目：

| 命令 | 描述 | 用途 |
| :--- | :--- | :--- |
| `npm run dev` | 本地启动 | 适用于开发和测试，支持热重载。 |
| `npm run build` | 编译项目 | 将 TypeScript 源码编译成 JavaScript。 |
| `npm run start` | 生产环境启动 | 在生产环境中运行已编译的 JS 文件。 |
| `npm run restart` | 生产环境重启 | 适用于已部署的服务重启。 |
| `npm run stop` | 生产环境停止 | 停止运行中的服务。 |

-----

## 📸 效果图和参考配置

1. 运行效果
    ![SnapShot](./doc/SnapShot.png)


2. 记录csv日志
    ![csv-log](./doc/csv-log.png)


3. Discord bot设置
    ![iscord-bot-setting](./doc/discord-bot-setting.png)


4. Discord获取token
    ![discord-bot-token](./doc/discord-bot-token.png)


5. Discord获取OAuth2 URL
    ![discord-bot-url](./doc/discord-bot-url1.png)
    ![discord-bot-url](./doc/discord-bot-url2.png)


6. Discord开发者模式
    ![discord-developer](./doc/discord-developer.png)


7. Discord获取ChannelId
    ![discord-channelId](./doc/discord-channelId.png)
