param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$FixturePath = "storage\smoke-fixture.png"
)

$ErrorActionPreference = "Stop"

$crossSiteGuarded = $false
try {
  Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/api/auth/login" -Method POST -Headers @{ Origin = "https://attacker.invalid" } -ContentType "application/json" -Body '{"email":"demo@postr.local","password":"postr-demo"}' | Out-Null
} catch {
  $crossSiteGuarded = $_.Exception.Response.StatusCode.value__ -eq 403
}
if (-not $crossSiteGuarded) { throw "Cross-site mutation guard did not reject the request." }

function Invoke-Json {
  param(
    [string]$Path,
    [string]$Method = "GET",
    [object]$Body,
    [string]$Cookie
  )
  $parameters = @{
    Uri = "$BaseUrl$Path"
    Method = $Method
    ContentType = "application/json"
  }
  if ($Method -ne "GET") { $parameters.Headers = @{ Origin = $BaseUrl } }
  if ($Cookie) { $parameters.WebSession = $script:ApiSession }
  if ($null -ne $Body) { $parameters.Body = ($Body | ConvertTo-Json -Compress) }
  Invoke-RestMethod @parameters
}

$loginResponse = Invoke-WebRequest -UseBasicParsing -Uri "$BaseUrl/api/auth/login" -Method POST -Headers @{ Origin = $BaseUrl } -ContentType "application/json" -Body '{"email":"demo@postr.local","password":"postr-demo"}'
$login = $loginResponse.Content | ConvertFrom-Json
if (-not $login.ok) { throw "Demo login failed." }

$setCookie = $loginResponse.Headers["Set-Cookie"]
$sessionCookie = if ($setCookie -match "postr_session=([^;]+)") { $Matches[1] } else { $null }
if (-not $sessionCookie) { throw "Session cookie was not created." }
$cookieHeader = "postr_session=$sessionCookie"
$script:ApiSession = New-Object Microsoft.PowerShell.Commands.WebRequestSession
$apiCookie = New-Object System.Net.Cookie("postr_session", $sessionCookie, "/", ([Uri]$BaseUrl).Host)
$script:ApiSession.Cookies.Add([Uri]$BaseUrl, $apiCookie)

$fixture = (Resolve-Path -LiteralPath $FixturePath).Path
$captureJson = & curl.exe -s -H "Cookie: $cookieHeader" -H "Origin: $BaseUrl" -F "platform=instagram" -F "sourceUrl=https://www.instagram.com/mock_creator/" -F "campaign=Automated smoke test" -F "screenshot=@$fixture;type=image/png" "$BaseUrl/api/capture"
$capture = $captureJson | ConvertFrom-Json
if ($capture.created -lt 1) { throw "Capture did not create a prospect: $captureJson" }
$prospectId = $capture.prospectIds[0]

Invoke-Json -Path "/api/prospects/$prospectId" -Method PATCH -Cookie $cookieHeader -Body @{ action = "approve" } | Out-Null
$draft = Invoke-Json -Path "/api/outreach" -Method POST -Cookie $cookieHeader -Body @{ prospectId = $prospectId }
Invoke-Json -Path "/api/outreach/$($draft.id)" -Method PATCH -Cookie $cookieHeader -Body @{ action = "approve" } | Out-Null

$sendGuarded = $false
try {
  Invoke-Json -Path "/api/gmail/send-approved-draft" -Method POST -Cookie $cookieHeader -Body @{ messageId = $draft.id } | Out-Null
} catch {
  $sendGuarded = $_.Exception.Response.StatusCode.value__ -eq 400
}
if (-not $sendGuarded) { throw "Gmail send confirmation guard did not reject the request." }

Invoke-Json -Path "/api/outreach/$($draft.id)" -Method PATCH -Cookie $cookieHeader -Body @{ action = "mark_sent" } | Out-Null
Invoke-Json -Path "/api/prospects/$prospectId/tracking" -Method POST -Cookie $cookieHeader -Body @{ action = "replied" } | Out-Null
Invoke-Json -Path "/api/prospects/$prospectId/tracking" -Method POST -Cookie $cookieHeader -Body @{ action = "interested" } | Out-Null
$copied = Invoke-Json -Path "/api/prospects/$prospectId/tracking" -Method POST -Cookie $cookieHeader -Body @{ action = "copy_referral" }
if (-not $copied.referralLink) { throw "Referral link was not returned." }
Invoke-Json -Path "/api/prospects/$prospectId/tracking" -Method POST -Cookie $cookieHeader -Body @{ action = "referral_sent" } | Out-Null
Invoke-Json -Path "/api/prospects/$prospectId/tracking" -Method POST -Cookie $cookieHeader -Body @{ action = "joined" } | Out-Null
Invoke-Json -Path "/api/opt-out" -Method POST -Body @{ email = "smoke-opt-out@example.com" } | Out-Null

$unauthorizedGuarded = $false
try {
  Invoke-Json -Path "/api/gmail/status" | Out-Null
} catch {
  $unauthorizedGuarded = $_.Exception.Response.StatusCode.value__ -eq 401
}
if (-not $unauthorizedGuarded) { throw "Protected API did not reject an unauthenticated request." }

[pscustomobject]@{
  crossSiteGuard = "passed"
  login = "passed"
  capture = "passed"
  prospectApproval = "passed"
  outreachApproval = "passed"
  gmailSendGuard = "passed"
  referralTracking = "passed"
  publicOptOut = "passed"
  authorizationGuard = "passed"
  prospectId = $prospectId
}
