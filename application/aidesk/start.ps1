# AIDesk 起動スクリプト
$env:PYTHONIOENCODING = "utf-8"

# バックエンド起動
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  cd '$PSScriptRoot\backend'
  & 'C:\Users\ryuki\anaconda3\python.exe' -m uvicorn main:app --reload --port 8000
"@

# フロントエンド起動
Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
  cd '$PSScriptRoot\frontend'
  npm run dev
"@

Write-Host "AIDesk 起動中..."
Write-Host "  フロントエンド: http://localhost:5173"
Write-Host "  バックエンドAPI: http://localhost:8000"
Start-Sleep 3
Start-Process "http://localhost:5173"
