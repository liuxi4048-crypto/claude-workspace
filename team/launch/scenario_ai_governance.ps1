# AIガバナンス三者合議レイアウト起動スクリプト
# CAIO（左）+ CLO（中央）+ CISO（右）

$weztermExe = "C:\Program Files\WezTerm\wezterm.exe"
$launchDir   = "C:\Claude\team\launch"

# CAIOを起動
& $weztermExe cli spawn --new-window `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\caio.ps1"

Start-Sleep -Milliseconds 800

# 右にCLOを分割
& $weztermExe cli split-pane --right --percent 66 `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\clo.ps1"

Start-Sleep -Milliseconds 600

# さらに右にCISOを分割
& $weztermExe cli split-pane --right --percent 50 `
  --cwd "C:\Claude" `
  -- pwsh -NoLogo -File "$launchDir\ciso.ps1"

Write-Host ""
Write-Host "AIガバナンス三者合議レイアウト起動完了" -ForegroundColor Blue
Write-Host "左: CAIO / 中: CLO / 右: CISO" -ForegroundColor DarkBlue
Write-Host "三者全員の承認後にCTOへ実装指示を出すこと" -ForegroundColor DarkGray
