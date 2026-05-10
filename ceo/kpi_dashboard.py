# -*- coding: utf-8 -*-
"""CEO KPI ダッシュボード -- ターミナル表示"""
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from datetime import datetime, date
import os
import re

BASE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(BASE, "business_log.md")

CYAN   = "\033[96m"
GREEN  = "\033[92m"
YELLOW = "\033[93m"
RED    = "\033[91m"
BOLD   = "\033[1m"
RESET  = "\033[0m"
DIM    = "\033[2m"


def read_log():
    if not os.path.exists(LOG):
        return ""
    with open(LOG, encoding="utf-8") as f:
        return f.read()


def extract_pipeline(text):
    rows = []
    in_table = False
    for line in text.splitlines():
        if "案件パイプライン" in line:
            in_table = True
        if in_table and line.startswith("|") and "---" not in line and "案件名" not in line and "#" not in line:
            cols = [c.strip() for c in line.strip("|").split("|")]
            if len(cols) >= 5 and cols[1] != "（未登録）":
                rows.append(cols)
        if in_table and line.strip() == "" and rows:
            break
    return rows


def extract_monthly_sales(text):
    sales = cost = profit = "¥0"
    for line in text.splitlines():
        if "売上合計" in line and "¥" in line:
            m = re.search(r"¥[\d,]+", line)
            if m:
                sales = m.group()
        if "コスト合計" in line and "¥" in line:
            m = re.search(r"¥[\d,]+", line)
            if m:
                cost = m.group()
        if "純利益" in line and "¥" in line:
            m = re.search(r"¥[\d,]+", line)
            if m:
                profit = m.group()
    return sales, cost, profit


def print_header():
    now = datetime.now().strftime("%Y-%m-%d %H:%M")
    print(f"\n{BOLD}{CYAN}{'='*60}{RESET}")
    print(f"{BOLD}{CYAN}  🏢 CEO KPI ダッシュボード  {DIM}{now}{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}\n")


def print_employees():
    print(f"{BOLD}  👥 AI社員ステータス{RESET}")
    employees = [
        ("🤝 営業・田中", "待機中", GREEN),
        ("💻 開発・佐藤", "待機中", GREEN),
        ("📢 マーケ・鈴木", "待機中", GREEN),
        ("💰 経理・山田", "待機中", GREEN),
    ]
    for name, status, color in employees:
        print(f"  {name:<20} [{color}{status}{RESET}]")
    print()


def print_financials(text):
    sales, cost, profit = extract_monthly_sales(text)
    print(f"{BOLD}  💴 今月の財務サマリー{RESET}")
    print(f"  {'売上合計':<12} {GREEN}{sales}{RESET}")
    print(f"  {'コスト合計':<12} {RED}{cost}{RESET}")
    print(f"  {'純利益':<12} {BOLD}{GREEN}{profit}{RESET}")
    print()


def print_pipeline(text):
    rows = extract_pipeline(text)
    print(f"{BOLD}  📋 案件パイプライン{RESET}")
    if not rows:
        print(f"  {DIM}案件なし — business_log.md に追記してください{RESET}")
    else:
        status_colors = {
            "商談中": YELLOW, "提案済み": CYAN, "成約": GREEN,
            "進行中": GREEN, "完了": DIM, "失注": RED,
        }
        for row in rows:
            idx, name, status, amount, agent, action = (row + [""] * 6)[:6]
            color = status_colors.get(status, RESET)
            print(f"  [{color}{status}{RESET}] {name:<20} {amount}")
    print()


def print_roadmap():
    today = date.today()
    week_num = (today.day - 1) // 7 + 1
    print(f"{BOLD}  🗺  今週のフォーカス（Week {week_num}）{RESET}")
    roadmap = [
        "CEO/AI社員体制の整備",
        "最初の案件獲得",
        "プロダクト改善・デプロイ",
        "コンテンツ強化・SNS発信",
    ]
    idx = min(week_num - 1, len(roadmap) - 1)
    print(f"  → {BOLD}{roadmap[idx]}{RESET}")
    print()


def print_quick_commands():
    print(f"{BOLD}  ⚡ クイックコマンド{RESET}")
    cmds = [
        ("案件登録", "business_log.md を編集"),
        ("営業指示", "sales_agent.md を参照して Claude に指示"),
        ("開発指示", "dev_agent.md を参照して Claude に指示"),
        ("コンテンツ作成", "marketing_agent.md を参照して Claude に指示"),
        ("売上集計", "finance_agent.md を参照して Claude に指示"),
    ]
    for cmd, desc in cmds:
        print(f"  {CYAN}{cmd:<16}{RESET} {DIM}{desc}{RESET}")
    print()


def main():
    text = read_log()
    print_header()
    print_employees()
    print_financials(text)
    print_pipeline(text)
    print_roadmap()
    print_quick_commands()
    print(f"{DIM}  ログ: {LOG}{RESET}")
    print(f"{BOLD}{CYAN}{'='*60}{RESET}\n")


if __name__ == "__main__":
    main()
