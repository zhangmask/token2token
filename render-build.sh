#!/usr/bin/env bash
set -e

echo "=== 安装 Node.js 依赖（lark-cli）==="
npm install -g @larksuiteoapi/cli

echo "=== 恢复飞书认证信息 ==="
if [ -n "$LARK_CLI_CONFIG" ]; then
    CONFIG_DIR="$HOME/.lark-cli"
    mkdir -p "$CONFIG_DIR"
    echo "$LARK_CLI_CONFIG" | base64 -d | tar -xz -C "$CONFIG_DIR"
    echo "飞书认证配置已恢复"
else
    echo "警告: LARK_CLI_CONFIG 未设置，请先在 Render 环境变量中配置"
fi

echo "=== 安装 Python 依赖 ==="
pip install -r requirements.txt

echo "=== 构建完成 ==="
