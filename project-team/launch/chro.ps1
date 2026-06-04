$host.UI.RawUI.WindowTitle = "CHRO | モロミーカンパニー（仮）"
Write-Host ""
Write-Host "┌──────────────────────────────────────────┐" -ForegroundColor DarkYellow
Write-Host "│  CHRO — 最高人事責任者                    │" -ForegroundColor DarkYellow
Write-Host "│  役割: 人員配置・採用・組織設計            │" -ForegroundColor DarkYellow
Write-Host "│  トリガー: 人員配置 / 採用                 │" -ForegroundColor DarkYellow
Write-Host "└──────────────────────────────────────────┘" -ForegroundColor DarkYellow
Write-Host ""
Write-Host "ペルソナ定義: C:\Claude\team\chro.md" -ForegroundColor DarkYellow
Write-Host ""
Set-Location "C:\Claude\team\workspaces\chro"
claude
