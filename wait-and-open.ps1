# 等待开发服务器真正就绪（HTTP 200）后再打开浏览器。
# 由 start-dev.bat 后台调用；轮询而非固定延时，避免浏览器先于服务器打开。
param(
  [string]$Url = 'http://localhost:5173/',
  [int]$Attempts = 60,
  [int]$IntervalMs = 500
)

for ($i = 0; $i -lt $Attempts; $i++) {
  try {
    $r = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) {
      Start-Process $Url
      exit 0
    }
  } catch {
    # 服务器还没起来，继续等待
  }
  Start-Sleep -Milliseconds $IntervalMs
}

# 超时仍尝试打开，让用户看到浏览器给出的具体错误
Start-Process $Url
exit 1
