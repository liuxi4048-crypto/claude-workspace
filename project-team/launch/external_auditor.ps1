$host.UI.RawUI.WindowTitle = "External Auditor | モロミーカンパニー（仮）"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor DarkGray
Write-Host "│  External Auditor — 外部監査              │" -ForegroundColor DarkGray
Write-Host "│  役割: 独立評価・オーナー直接報告          │" -ForegroundColor DarkGray
Write-Host "│  トリガー: 外部監査（マイルストーン固定）  │" -ForegroundColor DarkGray
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor DarkGray
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\external_auditor.md" -ForegroundColor DarkGray
Write-Host ""
Set-Location "C:\Claude\team\workspaces\external_auditor"
claude
