# CEO対立議論レイアウト起動スクリプト
# WezTermで2ペインを並列で開く: CEO-Ext（左）+ CEO-Int（右）

$weztermExe = "C:\Program Files\WezTerm\wezterm.exe"
$launchDir   = "C:\Claude\team\launch"

# 新しいタブでCEO-Extを起動
& $weztermExe cli spawn --new-window `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\ceo_ext.ps1"

# 少し待ってから右に分割してCEO-Intを起動
Start-Sleep -Milliseconds 800
& $weztermExe cli split-pane --right --percent 50 `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\ceo_int.ps1"

Write-Host ""
Write-Host "CEO対立議論レイアウト起動完了" -ForegroundColor Cyan
Write-Host "左: CEO-Ext（外向き）/ 右: CEO-Int（内向き）" -ForegroundColor DarkCyan
Write-Host "議論が終わったら Chairman ペインを別タブで開いてください（CTRL+ALT+3）" -ForegroundColor DarkGray
