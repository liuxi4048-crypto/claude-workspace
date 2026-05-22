# スプリント末監査レイアウト起動スクリプト
# Internal Auditor（左）+ Internal Tech Auditor（右）

$weztermExe = "C:\Program Files\WezTerm\wezterm.exe"
$launchDir   = "C:\Claude\team\launch"

& $weztermExe cli spawn --new-window `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\internal_auditor.ps1"

Start-Sleep -Milliseconds 800

& $weztermExe cli split-pane --right --percent 50 `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\internal_tech_auditor.ps1"

Write-Host ""
Write-Host "スプリント末監査レイアウト起動完了" -ForegroundColor DarkYellow
Write-Host "左: Internal Auditor / 右: Internal Tech Auditor" -ForegroundColor DarkYellow
Write-Host "監査完了後: punch_list.md を更新し retro_log.md でKPTを実施" -ForegroundColor DarkGray
