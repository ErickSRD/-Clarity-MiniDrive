Set-Location -Path 'C:\Proyecto DOC\Clarity-Test'

# create sample file
'sample file' | Out-File -Encoding UTF8 sample-upload.txt
$filePath = (Join-Path (Get-Location) 'sample-upload.txt')

$apiUrl = 'http://localhost:4000'

# login
$resp = Invoke-RestMethod -Method Post -Uri "$apiUrl/api/auth/login" -ContentType 'application/json' -Body '{"email":"admin@example.local","password":"secret123"}'
$token = $resp.token
Write-Output "TOKEN:$token"

# upload using curl.exe (avoid PowerShell Invoke-RestMethod multipart complexities)
# Ensure full path for curl file upload on Windows
$curlArgs = @('-s', '-H', "Authorization: Bearer $token", '-F', "files=@$filePath", "$apiUrl/api/files")
Write-Output "Running: curl.exe $($curlArgs -join ' ')"
& curl.exe @curlArgs
