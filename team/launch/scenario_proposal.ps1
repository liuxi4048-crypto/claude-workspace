# 提案作成レイアウト起動スクリプト
# CMO（左・提案文）+ CFO（右・見積）

$weztermExe = "C:\Program Files\WezTerm\wezterm.exe"
$launchDir   = "C:\Claude\team\launch"

& $weztermExe cli spawn --new-window `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\cmo.ps1"

Start-Sleep -Milliseconds 800

& $weztermExe cli split-pane --right --percent 40 `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\cfo.ps1"

Write-Host ""
Write-Host "提案作成レイアウト起動完了" -ForegroundColor Green
Write-Host "左: CMO（提案文）/ 右: CFO（見積）" -ForegroundColor DarkGreen
Write-Host "完成後: COOペインで統合してクライアントへ送付" -ForegroundColor DarkGray
