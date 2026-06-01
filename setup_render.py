#!/usr/bin/env python3
"""
Render 部署辅助脚本

使用方式：
  1. 确保已运行 lark-cli auth login --domain base
  2. 运行本脚本: python setup_render.py
  3. 将输出的内容设置为 Render 环境变量 LARK_CLI_CONFIG
"""

import os
import tarfile
import base64
import io
import subprocess
import platform


def get_config_dir():
    system = platform.system()
    home = os.path.expanduser("~")
    
    candidates = [
        os.path.join(home, ".lark-cli"),
    ]
    
    if system == "Windows":
        candidates.append(os.path.join(os.environ.get("USERPROFILE", ""), ".config", "lark-cli"))
        candidates.append(os.path.join(os.environ.get("LOCALAPPDATA", ""), "lark-cli"))
        candidates.append(os.path.join(os.environ.get("APPDATA", ""), "lark-cli"))
    else:
        candidates.append(os.path.join(home, ".config", "lark-cli"))
        xdg = os.environ.get("XDG_CONFIG_HOME", "")
        if xdg:
            candidates.append(os.path.join(xdg, "lark-cli"))
    
    for config_dir in candidates:
        config_file = os.path.join(config_dir, "config.json")
        if os.path.exists(config_file):
            return config_dir
    
    print(f"❌ 未找到 lark-cli 配置目录")
    print(f"   请先运行: lark-cli auth login --domain base")
    return None


def check_lark_cli():
    system = platform.system()
    if system == "Windows":
        commands = ["lark-cli.cmd", "lark-cli"]
        npm_path = os.path.expanduser("~\\AppData\\Roaming\\npm\\lark-cli.cmd")
        if os.path.exists(npm_path):
            commands.insert(0, npm_path)
    else:
        commands = ["lark-cli"]
    
    for cmd in commands:
        try:
            result = subprocess.run([cmd, "auth", "status"], capture_output=True, text=True, timeout=10)
            if result.returncode == 0:
                return cmd
        except:
            continue
    return None


def main():
    print("=== TokenPlan Render 部署配置工具 ===\n")

    cli_cmd = check_lark_cli()
    if not cli_cmd:
        print("❌ lark-cli 未登录，请先运行:")
        print("   lark-cli auth login --domain base")
        return
    print("✅ lark-cli 已登录\n")

    config_dir = get_config_dir()
    if not config_dir:
        return

    # 打包配置目录
    buf = io.BytesIO()
    with tarfile.open(fileobj=buf, mode="w:gz") as tar:
        tar.add(config_dir, arcname=".")
    
    base64_str = base64.b64encode(buf.getvalue()).decode("utf-8")
    
    print("✅ 飞书认证配置已导出")
    print(f"   ├── 用户名: 从 lark-cli auth status 查看")
    print(f"   ├── 配置大小: {len(base64_str)} 字符")
    print(f"   └── 过期时间: 约 7 天后需重新导出\n")
    
    print("=== 下一步：部署到 Render ===")
    print()
    print("1. 将代码推送到 GitHub")
    print()
    print("2. 在 Render 创建 Web Service，选择该仓库")
    print()
    print("3. 设置 Build Command:")
    print("   chmod +x render-build.sh && ./render-build.sh")
    print()
    print("4. 设置 Start Command:")
    print("   gunicorn app:app")
    print()
    print("5. 添加环境变量:")
    print("   名称: LARK_CLI_CONFIG")
    print("   值: (将下方内容完整复制粘贴)")
    print()
    print("=" * 50)
    print(base64_str)
    print("=" * 50)
    print()
    print("6. 部署完成后即可通过 Render 分配的 URL 访问 🎉")


if __name__ == "__main__":
    main()
