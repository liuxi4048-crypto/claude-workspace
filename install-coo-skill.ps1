# COO スキルを Claude のグローバルスキルとして登録するインストールスクリプト
$skillDir = "$env:USERPROFILE\.claude\skills\coo"
$skillFile = "$skillDir\SKILL.md"
$rawUrl = "https://raw.githubusercontent.com/liuxi4048-crypto/claude-workspace/master/.claude/skills/coo/SKILL.md"

Write-Host "COO スキルをインストールしています..." -ForegroundColor Cyan

New-Item -ItemType Directory -Force $skillDir | Out-Null

Invoke-WebRequest -Uri $rawUrl -OutFile $skillFile -UseBasicParsing
Write-Host "インストール完了: $skillFile" -ForegroundColor Green
Write-Host "Claude Code を再起動すると /coo が使えるようになります。" -ForegroundColor Yellow