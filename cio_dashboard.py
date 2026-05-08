#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# CIO Dashboard -- C:\Claude ワークスペース状況レポート
# 使い方: python cio_dashboard.py

import os
import sys
import datetime
from pathlib import Path

# Windows コンソールを UTF-8 出力に切り替え
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).parent
MEMORY = ROOT / ".claude" / "memory"


def c(text, code):
    return f"\033[{code}m{text}\033[0m"


BOLD   = lambda t: c(t, "1")
CYAN   = lambda t: c(t, "36")
GREEN  = lambda t: c(t, "32")
YELLOW = lambda t: c(t, "33")
RED    = lambda t: c(t, "31")
DIM    = lambda t: c(t, "2")


def divider(char="─", width=62):
    print(DIM(char * width))


def section(title):
    print()
    print(BOLD(CYAN(f"  {title}")))
    divider()


def file_age_days(path: Path) -> int:
    if not path.exists():
        return -1
    mtime = datetime.datetime.fromtimestamp(path.stat().st_mtime)
    return (datetime.datetime.now() - mtime).days


def age_label(days: int) -> str:
    if days < 0:
        return RED("存在しない")
    if days == 0:
        return GREEN("今日更新")
    if days <= 3:
        return GREEN(f"{days}日前")
    if days <= 14:
        return YELLOW(f"{days}日前")
    return DIM(f"{days}日前")


PROJECTS = [
    {
        "name": "file_rewriter",
        "path": ROOT,
        "key_files": ["file_rewriter.py"],
        "tech": "Python + Claude Opus 4.6",
        "status": "稼働中",
        "port": None,
    },
    {
        "name": "baito-kanri",
        "path": ROOT / "baito-kanri",
        "key_files": ["src/App.tsx", "package.json"],
        "tech": "React 19 + TypeScript + Vite",
        "status": "デプロイ済み",
        "port": 4173,
    },
    {
        "name": "calendar_app",
        "path": ROOT / "calendar_app",
        "key_files": ["app.py"],
        "tech": "Flask + Google Calendar API",
        "status": "ローカル稼働",
        "port": 5000,
    },
    {
        "name": "tangocho",
        "path": ROOT / "tangocho",
        "key_files": ["app.js", "index.html"],
        "tech": "Vanilla JS + Firebase PWA",
        "status": "稼働中",
        "port": 8765,
    },
    {
        "name": "skills",
        "path": ROOT / "skills",
        "key_files": ["SKILL.md"],
        "tech": "Claude Skills",
        "status": "登録済み",
        "port": None,
    },
    {
        "name": "cowork",
        "path": ROOT / "cowork",
        "key_files": [],
        "tech": "創作物置き場",
        "status": "出力のみ",
        "port": None,
    },
]


def header():
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
    bar = "=" * 50
    print()
    print(BOLD(f"  +{bar}+"))
    print(BOLD(f"  |   CIO Dashboard  C:\\Claude{' ' * 22}|"))
    print(BOLD(f"  |   {now}{' ' * 37}|"))
    print(BOLD(f"  +{bar}+"))


def project_section():
    section("プロジェクト一覧")
    for p in PROJECTS:
        path = p["path"]
        exists = path.exists()

        latest_days = 999
        for kf in p["key_files"]:
            d = file_age_days(path / kf)
            if 0 <= d < latest_days:
                latest_days = d
        if not p["key_files"] or latest_days == 999:
            latest_days = file_age_days(path) if exists else -1

        age = age_label(latest_days) if exists else RED("存在しない")
        port_str = f"  port:{p['port']}" if p["port"] else ""

        ok_statuses = ("稼働", "済み", "登録")
        status_ok = any(s in p["status"] for s in ok_statuses)
        status_colored = GREEN(p["status"]) if status_ok else YELLOW(p["status"])

        name_col = p["name"].ljust(16)
        print(f"  {BOLD(name_col)} {status_colored:<30}  最終更新: {age}")
        print(f"  {'':16} {DIM(p['tech'] + port_str)}")
        print()


def watch_folder_section():
    section("watch_folder（file_rewriter 待機中）")
    wf = ROOT / "watch_folder"
    if not wf.exists():
        print(RED("  watch_folder が存在しません"))
        return
    files = [f for f in wf.iterdir() if f.is_file() and not f.name.startswith(".")]
    if not files:
        print(DIM("  （空）— ファイルを投入すると自動整形されます"))
    else:
        for f in sorted(files, key=lambda x: x.stat().st_mtime, reverse=True):
            age = file_age_days(f)
            size = f.stat().st_size
            print(f"  {f.name:<35} {DIM(f'{size:,} bytes')}  {age_label(age)}")


def cowork_section():
    section("cowork/ 出力物")
    cw = ROOT / "cowork"
    if not cw.exists():
        print(DIM("  （存在しない）"))
        return
    items = sorted(cw.iterdir())
    if not items:
        print(DIM("  （空）"))
        return
    for item in items:
        if item.is_dir():
            file_count = len(list(item.iterdir()))
            age = file_age_days(item)
            print(f"  {item.name:<30} {file_count} ファイル  {age_label(age)}")


def memory_section():
    section("CIO メモリ（.claude/memory/）")
    mem_files = {
        "roadmap.md": "ロードマップ",
        "decisions.md": "技術的決定",
        "project_status.md": "プロジェクト状態",
    }
    if not MEMORY.exists():
        print(RED("  .claude/memory/ が存在しません"))
        return
    for fname, label in mem_files.items():
        fpath = MEMORY / fname
        age = file_age_days(fpath)
        if fpath.exists():
            lines = len(fpath.read_text(encoding="utf-8").splitlines())
            print(f"  {label:<20} {age_label(age)}  ({lines} 行)")
        else:
            print(f"  {label:<20} {RED('未作成')}")


def alerts_section():
    roadmap = MEMORY / "roadmap.md"
    if not roadmap.exists():
        return
    text = roadmap.read_text(encoding="utf-8")
    p1_items = []
    in_p1 = False
    for line in text.splitlines():
        if "今すぐ" in line or "（P1）" in line and line.startswith("##"):
            in_p1 = True
        elif line.startswith("## ") and in_p1:
            break
        elif in_p1 and line.strip().startswith("- [ ]"):
            p1_items.append(line.strip()[6:])

    if p1_items:
        section("P1 アラート（要対応）")
        for item in p1_items:
            print(f"  {RED('!')} {item}")


def footer():
    print()
    divider()
    print(DIM("  CIO に話しかける : C:\\Claude で claude を起動"))
    print(DIM("  ロードマップ更新  : .claude/memory/roadmap.md を編集"))
    divider()
    print()


def main():
    os.system("")  # Windows で ANSI カラーを有効化
    header()
    project_section()
    watch_folder_section()
    cowork_section()
    memory_section()
    alerts_section()
    footer()


if __name__ == "__main__":
    main()
