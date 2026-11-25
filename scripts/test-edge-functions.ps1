<#
.SYNOPSIS
  Integration tests for EIRMIS Edge Functions against the LOCAL Supabase stack.

.DESCRIPTION
  Every case asserts an exact HTTP status AND a response-body pattern, so a test
  only passes when the function rejects/accepts for the reason under test.

  Prerequisites:
    supabase start            (functions are served by the local edge runtime)
    supabase db reset         (loads supabase/seed.sql fixtures used below)
    supabase/.env.local       (QR_SIGNING_SECRET, SCANNER_WEBHOOK_SECRET, ...)

  By default the suite is read-only: every request fails validation/authorization
  before any write or email side effect. -IncludeMutations adds a check-in flow
  that writes to the database (restored afterwards; `supabase db reset` to fully reset).

.EXAMPLE
  powershell -NoProfile -File ./scripts/test-edge-functions.ps1
  powershell -NoProfile -File ./scripts/test-edge-functions.ps1 -IncludeMutations -ShowBodies
#>
param(
  [string]$BaseUrl = "http://127.0.0.1:54321",
  [switch]$IncludeMutations,
  [switch]$ShowBodies
)

$ErrorActionPreference = "Stop"
$fn = "$BaseUrl/functions/v1"

# --- Seed fixtures (supabase/seed.sql) ----------------------------------------
$EVENT_PUBLISHED_OPEN = "55555555-5555-5555-5555-555555555551"   # owned by organizer
$EVENT_DRAFT          = "55555555-5555-5555-5555-555555555552"
$INV_ACCEPTED         = "66666666-6666-6666-6666-666666666662"   # guest2 (not the logged-in guest)
$ATT_PRIMARY          = "77777777-7777-7777-7777-777777777772"
$ATT_APPROVED         = "77777777-7777-7777-7777-777777777773"
$ATT_PENDING          = "77777777-7777-7777-7777-777777777774"
$HC_PENDING           = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1"
$HC_APPROVED          = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2"
$UNKNOWN_ID           = "00000000-0000-4000-8000-000000000000"

# --- Keys from the running stack ----------------------------------------------
$ErrorActionPreference = "Continue"   # the CLI writes progress/update notices to stderr
$statusRaw = (& supabase status -o json 2>$null | Out-String)
$ErrorActionPreference = "Stop"
$status = $statusRaw.Substring($statusRaw.IndexOf("{")) | ConvertFrom-Json
$ANON = $status.ANON_KEY
$SERVICE = $status.SERVICE_ROLE_KEY
if (-not $ANON -or -not $SERVICE) { throw "Could not read keys from 'supabase status'. Is the stack running?" }

# --- Function secrets (for signing test tokens / webhook bodies) --------------
$secrets = @{}
$envFile = Join-Path $PSScriptRoot "..\supabase\.env.local"
if (Test-Path $envFile) {
  Get-Content $envFile | Where-Object { $_ -match '^\s*([A-Z_]+)\s*=\s*(.*)$' } | ForEach-Object {
    $secrets[$Matches[1]] = $Matches[2].Trim().Trim('"')
  }
}
$QR_SECRET = $secrets["QR_SIGNING_SECRET"]
$WEBHOOK_SECRET = $secrets["SCANNER_WEBHOOK_SECRET"]

# --- HTTP helper (curl.exe; body via file to avoid PS 5.1 quote mangling) -----
$tmp = Join-Path $env:TEMP "eirmis-edge-tests"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
$utf8 = New-Object System.Text.UTF8Encoding $false

function Invoke-Api {
  param([string]$Method, [string]$Url, [hashtable]$Headers = @{}, [string]$Body, [string[]]$Form, [string]$ContentType = "application/json")
  $outFile = Join-Path $tmp "resp.txt"
  if (Test-Path $outFile) { Remove-Item $outFile }
  $curlArgs = @("-s", "-o", $outFile, "-w", "%{http_code}", "-X", $Method, $Url)
  foreach ($k in $Headers.Keys) { $curlArgs += @("-H", "${k}: $($Headers[$k])") }
  if ($PSBoundParameters.ContainsKey("Body")) {
    $bodyFile = Join-Path $tmp "body.txt"
    [IO.File]::WriteAllText($bodyFile, $Body, $utf8)
    $curlArgs += @("-H", "Content-Type: $ContentType", "--data-binary", "@$bodyFile")
  }
  foreach ($f in $Form) { $curlArgs += @("-F", $f) }
  for ($attempt = 1; $attempt -le 4; $attempt++) {
    $code = & curl.exe @curlArgs
    $text = if (Test-Path $outFile) { [IO.File]::ReadAllText($outFile) } else { "" }
    # Retry transient Kong 502/503 when local edge-runtime recycles workers
    if (([int]$code -in @(502, 503)) -and ($text -match "invalid response was received from the upstream|name resolution failed|worker_pool")) {
      Start-Sleep -Seconds 2
      continue
    }
    break
  }
  return @{ Status = [int]$code; Body = $text }
}

# --- Test runner ----------------------------------------------------------------
$results = New-Object System.Collections.ArrayList
$currentGroup = ""

function Section([string]$name) {
  $script:currentGroup = $name
  Write-Host "`n=== $name ===" -ForegroundColor Cyan
}

function Test {
  param(
    [string]$Name, [string]$Method = "POST", [string]$Path,
    [hashtable]$Headers = @{}, [string]$Body, [string[]]$Form, [string]$ContentType = "application/json",
    [int[]]$Status, [string]$Match, [string]$Note
  )
  $req = @{ Method = $Method; Url = "$fn$Path"; Headers = $Headers; ContentType = $ContentType }
  if ($PSBoundParameters.ContainsKey("Body")) { $req.Body = $Body }
  if ($Form) { $req.Form = $Form }
  $r = Invoke-Api @req

  $statusOk = $Status -contains $r.Status
  $bodyOk = (-not $Match) -or ($r.Body -match $Match)
  $pass = $statusOk -and $bodyOk
  [void]$results.Add([pscustomobject]@{ Fn = $script:currentGroup; Name = $Name; Pass = $pass; Status = $r.Status; Expected = ($Status -join "/"); Body = $r.Body; Note = $Note })

  $snippet = if ($r.Body.Length -gt 220) { $r.Body.Substring(0, 220) + "..." } else { $r.Body }
  if ($pass) {
    Write-Host ("  PASS  {0} -> {1}" -f $Name, $r.Status) -ForegroundColor Green
    if ($ShowBodies) { Write-Host "        $snippet" -ForegroundColor DarkGray }
  } else {
    $why = if (-not $statusOk) { "status $($r.Status), expected $($Status -join '/')" } else { "body did not match /$Match/" }
    Write-Host ("  FAIL  {0} -> {1}" -f $Name, $why) -ForegroundColor Red
    Write-Host "        $snippet" -ForegroundColor DarkYellow
    if ($Note) { Write-Host "        note: $Note" -ForegroundColor DarkYellow }
  }
}

function Skip([string]$Name, [string]$Reason) {
  [void]$results.Add([pscustomobject]@{ Fn = $script:currentGroup; Name = $Name; Pass = $null; Status = ""; Expected = ""; Body = ""; Note = $Reason })
  Write-Host "  SKIP  $Name ($Reason)" -ForegroundColor DarkGray
}

# --- Token helpers ----------------------------------------------------------------
function ConvertTo-B64Url([byte[]]$bytes) { [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_') }

function New-QrToken {
  param([string]$AttendeeId, [string]$EventId, [string]$InvitationId, [int]$IatOffset = 0, [int]$ExpOffset = 3600, [string]$Secret = $QR_SECRET)
  $now = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
  $header = ConvertTo-B64Url ($utf8.GetBytes('{"alg":"HS256","typ":"JWT"}'))
  $payloadJson = '{{"attendee_id":"{0}","event_id":"{1}","invitation_id":"{2}","iat":{3},"exp":{4}}}' -f $AttendeeId, $EventId, $InvitationId, ($now + $IatOffset), ($now + $ExpOffset)
  $payload = ConvertTo-B64Url ($utf8.GetBytes($payloadJson))
  $hmac = New-Object System.Security.Cryptography.HMACSHA256 (, $utf8.GetBytes($Secret))
  $sig = ConvertTo-B64Url ($hmac.ComputeHash($utf8.GetBytes("$header.$payload")))
  return "$header.$payload.$sig"
}

function Get-HmacHex([string]$Body, [string]$Secret) {
  $hmac = New-Object System.Security.Cryptography.HMACSHA256 (, $utf8.GetBytes($Secret))
  return (($hmac.ComputeHash($utf8.GetBytes($Body)) | ForEach-Object { $_.ToString("x2") }) -join "")
}

function Get-Jwt([string]$Email) {
  $r = Invoke-Api -Method POST -Url "$BaseUrl/auth/v1/token?grant_type=password" -Headers @{ apikey = $ANON } -Body ('{{"email":"{0}","password":"password123"}}' -f $Email)
  if ($r.Status -ne 200) { throw "Login failed for $Email ($($r.Status)): $($r.Body). Run 'supabase db reset' to load seed users." }
  return ($r.Body | ConvertFrom-Json).access_token
}

# --- Sessions -------------------------------------------------------------------
Write-Host "EIRMIS Edge Function integration tests -> $fn" -ForegroundColor White
$ORG = Get-Jwt "organizer@example.com"      # active organizer, owns all seed events
$ORG2 = Get-Jwt "organizer2@example.com"    # pending organizer, owns nothing
$GUEST = Get-Jwt "guest@example.com"
$STAFF = Get-Jwt "staff@example.com"        # active check-in assignment on EVENT_PUBLISHED_OPEN

$H_NONE = @{ apikey = $ANON }
$H_ANON = @{ apikey = $ANON; Authorization = "Bearer $ANON" }
$H_BAD = @{ apikey = $ANON; Authorization = "Bearer not-a-real-jwt" }
$H_SVC = @{ apikey = $ANON; Authorization = "Bearer $SERVICE" }
$H_ORG = @{ apikey = $ANON; Authorization = "Bearer $ORG" }
$H_ORG2 = @{ apikey = $ANON; Authorization = "Bearer $ORG2" }
$H_GUEST = @{ apikey = $ANON; Authorization = "Bearer $GUEST" }
$H_STAFF = @{ apikey = $ANON; Authorization = "Bearer $STAFF" }
$AUTH_REJECTED = "UNAUTHORIZED|Unauthorized|authorization|authentication|JWT|token"

# =============================================================================
Section "reminders  POST /reminders/dispatch  (service role only)"
Test "CORS preflight" -Method OPTIONS -Path "/reminders/dispatch" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/reminders/dispatch" -Headers $H_SVC -Status 405 -Match "METHOD_NOT_ALLOWED"
Test "unknown sub-route" -Path "/reminders/other" -Headers $H_SVC -Body "{}" -Status 404 -Match "NOT_FOUND"
Test "no Authorization header" -Path "/reminders/dispatch" -Headers $H_NONE -Body "{}" -Status 401 -Match $AUTH_REJECTED
Test "anon key rejected" -Path "/reminders/dispatch" -Headers $H_ANON -Body "{}" -Status 401 -Match "UNAUTHORIZED"
Test "organizer JWT rejected" -Path "/reminders/dispatch" -Headers $H_ORG -Body "{}" -Status 401 -Match "UNAUTHORIZED"
Test "invalid JSON" -Path "/reminders/dispatch" -Headers $H_SVC -Body "{not json" -Status 400 -Match "INVALID_JSON"
Test "array body" -Path "/reminders/dispatch" -Headers $H_SVC -Body "[]" -Status 400 -Match "INVALID_REQUEST"
Test "event_id not a UUID" -Path "/reminders/dispatch" -Headers $H_SVC -Body '{"event_id":"abc"}' -Status 400 -Match "INVALID_EVENT_ID"
Test "dry_run not boolean" -Path "/reminders/dispatch" -Headers $H_SVC -Body '{"dry_run":"yes"}' -Status 400 -Match "INVALID_DRY_RUN"
Test "dry run (all events)" -Path "/reminders/dispatch" -Headers $H_SVC -Body '{"dry_run":true}' -Status 200 -Match '"dry_run":true'
Test "dry run (single event)" -Path "/reminders/dispatch" -Headers $H_SVC -Body ('{{"dry_run":true,"event_id":"{0}"}}' -f $EVENT_PUBLISHED_OPEN) -Status 200 -Match '"processed_schedules":\d+'

# =============================================================================
Section "register-public  POST /register-public  (public, verify_jwt = false)"
Test "CORS preflight" -Method OPTIONS -Path "/register-public" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/register-public" -Headers $H_NONE -Status 405 -Match "Method Not Allowed"
Test "invalid JSON" -Path "/register-public" -Headers $H_NONE -Body "{oops" -Status 400 -Match "valid JSON"
Test "array body" -Path "/register-public" -Headers $H_NONE -Body "[]" -Status 400 -Match "Invalid request body"
Test "event_id not a UUID" -Path "/register-public" -Headers $H_NONE -Body '{"event_id":"x","email":"a@b.co","full_name":"A"}' -Status 400 -Match "event_id"
Test "invalid email" -Path "/register-public" -Headers $H_NONE -Body ('{{"event_id":"{0}","email":"nope","full_name":"A"}}' -f $EVENT_PUBLISHED_OPEN) -Status 400 -Match "email"
Test "blank full_name" -Path "/register-public" -Headers $H_NONE -Body ('{{"event_id":"{0}","email":"a@b.co","full_name":"  "}}' -f $EVENT_PUBLISHED_OPEN) -Status 400 -Match "full name"
Test "unknown event" -Path "/register-public" -Headers $H_NONE -Body ('{{"event_id":"{0}","email":"a@b.co","full_name":"A"}}' -f $UNKNOWN_ID) -Status 404 -Match "Event not found"
Test "draft event not open for registration" -Path "/register-public" -Headers $H_NONE -Body ('{{"event_id":"{0}","email":"a@b.co","full_name":"A"}}' -f $EVENT_DRAFT) -Status 409 -Match "not currently accepting"

# =============================================================================
Section "checkin  POST /checkin/scan"
Test "CORS preflight" -Method OPTIONS -Path "/checkin/scan" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/checkin/scan" -Headers $H_STAFF -Status 405 -Match "METHOD_NOT_ALLOWED"
Test "unknown sub-route" -Path "/checkin/other" -Headers $H_STAFF -Body "{}" -Status 404 -Match "NOT_FOUND"
Test "no Authorization header" -Path "/checkin/scan" -Headers $H_NONE -Body "{}" -Status 401 -Match $AUTH_REJECTED
Test "garbage JWT" -Path "/checkin/scan" -Headers $H_BAD -Body "{}" -Status 401 -Match $AUTH_REJECTED
Test "invalid JSON" -Path "/checkin/scan" -Headers $H_STAFF -Body "{oops" -Status 400 -Match "INVALID_REQUEST"
Test "missing qr_token" -Path "/checkin/scan" -Headers $H_STAFF -Body "{}" -Status 400 -Match "qr_token is required"
Test "malformed token" -Path "/checkin/scan" -Headers $H_STAFF -Body '{"qr_token":"abc"}' -Status 422 -Match "INVALID_QR_TOKEN"
Test "unsigned seed token" -Path "/checkin/scan" -Headers $H_STAFF -Body '{"qr_token":"token-primary-001"}' -Status 422 -Match "INVALID_QR_TOKEN"

if ($QR_SECRET) {
  $good = New-QrToken -AttendeeId $ATT_PRIMARY -EventId $EVENT_PUBLISHED_OPEN -InvitationId $INV_ACCEPTED
  $forged = New-QrToken -AttendeeId $ATT_PRIMARY -EventId $EVENT_PUBLISHED_OPEN -InvitationId $INV_ACCEPTED -Secret "wrong-secret"
  $expired = New-QrToken -AttendeeId $ATT_PRIMARY -EventId $EVENT_PUBLISHED_OPEN -InvitationId $INV_ACCEPTED -IatOffset -7200 -ExpOffset -60
  $future = New-QrToken -AttendeeId $ATT_PRIMARY -EventId $EVENT_PUBLISHED_OPEN -InvitationId $INV_ACCEPTED -IatOffset 3600 -ExpOffset 7200
  Test "token signed with wrong secret" -Path "/checkin/scan" -Headers $H_STAFF -Body ('{{"qr_token":"{0}"}}' -f $forged) -Status 422 -Match "signature"
  Test "expired token" -Path "/checkin/scan" -Headers $H_STAFF -Body ('{{"qr_token":"{0}"}}' -f $expired) -Status 422 -Match "expired"
  Test "token issued in the future" -Path "/checkin/scan" -Headers $H_STAFF -Body ('{{"qr_token":"{0}"}}' -f $future) -Status 422 -Match "future"
  Test "token for a different event" -Path "/checkin/scan" -Headers $H_STAFF -Body ('{{"qr_token":"{0}","event_id":"{1}"}}' -f $good, $EVENT_DRAFT) -Status 422 -Match "EVENT_MISMATCH"
  Test "valid signature, token not on file" -Path "/checkin/scan" -Headers $H_STAFF -Body ('{{"qr_token":"{0}"}}' -f $good) -Status 200 -Match '"result":"invalid_token"'
} else {
  Skip "signed-token cases" "QR_SIGNING_SECRET not found in supabase/.env.local"
}

# =============================================================================
Section "waitlist  POST /waitlist/promote  (event organizer)"
Test "CORS preflight" -Method OPTIONS -Path "/waitlist/promote" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/waitlist/promote" -Headers $H_ORG -Status 405 -Match "Method Not Allowed"
Test "unknown sub-route" -Path "/waitlist/other" -Headers $H_ORG -Body "{}" -Status 404 -Match "Not Found"
Test "no Authorization header" -Path "/waitlist/promote" -Headers $H_NONE -Body "{}" -Status 401 -Match $AUTH_REJECTED
Test "invalid JSON" -Path "/waitlist/promote" -Headers $H_ORG -Body "{oops" -Status 400 -Match "valid JSON"
Test "array body" -Path "/waitlist/promote" -Headers $H_ORG -Body "[]" -Status 400 -Match "JSON object"
Test "event_id not a UUID" -Path "/waitlist/promote" -Headers $H_ORG -Body '{"event_id":"x"}' -Status 400 -Match "event_id"
Test "max_promotions = 0" -Path "/waitlist/promote" -Headers $H_ORG -Body ('{{"event_id":"{0}","max_promotions":0}}' -f $EVENT_PUBLISHED_OPEN) -Status 400 -Match "max_promotions"
Test "max_promotions = 1.5" -Path "/waitlist/promote" -Headers $H_ORG -Body ('{{"event_id":"{0}","max_promotions":1.5}}' -f $EVENT_PUBLISHED_OPEN) -Status 400 -Match "max_promotions"
Test "other organizer forbidden" -Path "/waitlist/promote" -Headers $H_ORG2 -Body ('{{"event_id":"{0}"}}' -f $EVENT_PUBLISHED_OPEN) -Status 403 -Match "Forbidden"
Test "guest forbidden" -Path "/waitlist/promote" -Headers $H_GUEST -Body ('{{"event_id":"{0}"}}' -f $EVENT_PUBLISHED_OPEN) -Status 403 -Match "Forbidden"
Test "check-in staff forbidden" -Path "/waitlist/promote" -Headers $H_STAFF -Body ('{{"event_id":"{0}"}}' -f $EVENT_PUBLISHED_OPEN) -Status 403 -Match "Forbidden"

# =============================================================================
Section "qr-bundle  POST /qr-bundle  (active organizer)"
Test "CORS preflight" -Method OPTIONS -Path "/qr-bundle" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/qr-bundle" -Headers $H_ORG -Status 405 -Match "METHOD_NOT_ALLOWED"
Test "no Authorization header" -Path "/qr-bundle" -Headers $H_NONE -Body "{}" -Status 401 -Match $AUTH_REJECTED
Test "invalid JSON" -Path "/qr-bundle" -Headers $H_ORG -Body "{oops" -Status 400 -Match "INVALID_JSON"
Test "array body" -Path "/qr-bundle" -Headers $H_ORG -Body "[]" -Status 400 -Match "INVALID_REQUEST"
Test "neither event_id nor invitation_id" -Path "/qr-bundle" -Headers $H_ORG -Body "{}" -Status 400 -Match "Either event_id or invitation_id"
Test "invitation_id not a UUID" -Path "/qr-bundle" -Headers $H_ORG -Body '{"invitation_id":"x"}' -Status 400 -Match "INVALID_INVITATION_ID"
Test "event_id not a UUID" -Path "/qr-bundle" -Headers $H_ORG -Body '{"event_id":"x"}' -Status 400 -Match "INVALID_EVENT_ID"
Test "force_resend not boolean" -Path "/qr-bundle" -Headers $H_ORG -Body ('{{"event_id":"{0}","force_resend":"yes"}}' -f $EVENT_PUBLISHED_OPEN) -Status 400 -Match "INVALID_FORCE_RESEND"
Test "pending organizer forbidden" -Path "/qr-bundle" -Headers $H_ORG2 -Body ('{{"event_id":"{0}"}}' -f $EVENT_PUBLISHED_OPEN) -Status 403 -Match "active organizer"
Test "guest forbidden" -Path "/qr-bundle" -Headers $H_GUEST -Body ('{{"event_id":"{0}"}}' -f $EVENT_PUBLISHED_OPEN) -Status 403 -Match "FORBIDDEN"
Test "unknown event" -Path "/qr-bundle" -Headers $H_ORG -Body ('{{"event_id":"{0}"}}' -f $UNKNOWN_ID) -Status 404 -Match "Event not found"
Test "unknown invitation" -Path "/qr-bundle" -Headers $H_ORG -Body ('{{"invitation_id":"{0}"}}' -f $UNKNOWN_ID) -Status 404 -Match "Invitation not found"
Test "invitation/event mismatch" -Path "/qr-bundle" -Headers $H_ORG -Body ('{{"invitation_id":"{0}","event_id":"{1}"}}' -f $INV_ACCEPTED, $EVENT_DRAFT) -Status 404 -Match "does not belong"

# =============================================================================
Section "invitation-html  POST /invitation-html  (multipart, event owner)"
$htmlOk = Join-Path $tmp "ok.html";          [IO.File]::WriteAllText($htmlOk, "<!doctype html><html><body><h1>You're invited</h1></body></html>", $utf8)
$htmlBad = Join-Path $tmp "external.html";   [IO.File]::WriteAllText($htmlBad, '<!doctype html><html><body><script src="https://evil.example/x.js"></script></body></html>', $utf8)
$txtFile = Join-Path $tmp "note.txt";        [IO.File]::WriteAllText($txtFile, "plain text", $utf8)
Test "CORS preflight" -Method OPTIONS -Path "/invitation-html" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/invitation-html" -Headers $H_ORG -Status 405 -Match "UPLOAD_405"
Test "no Authorization header" -Path "/invitation-html" -Headers $H_NONE -Form @("event_id=$EVENT_PUBLISHED_OPEN") -Status 401 -Match $AUTH_REJECTED
Test "garbage JWT" -Path "/invitation-html" -Headers $H_BAD -Form @("event_id=$EVENT_PUBLISHED_OPEN") -Status 401 -Match $AUTH_REJECTED
Test "JSON instead of multipart" -Path "/invitation-html" -Headers $H_ORG -Body "{}" -Status 400 -Match "multipart"
Test "non-HTML file" -Path "/invitation-html" -Headers $H_ORG -Form @("file=@$txtFile;type=text/plain", "event_id=$EVENT_PUBLISHED_OPEN") -Status 400 -Match "text/html"
Test "event_id not a UUID" -Path "/invitation-html" -Headers $H_ORG -Form @("file=@$htmlOk;type=text/html", "event_id=x") -Status 400 -Match "event_id"
Test "other organizer's event" -Path "/invitation-html" -Headers $H_ORG2 -Form @("file=@$htmlOk;type=text/html", "event_id=$EVENT_PUBLISHED_OPEN") -Status 403 -Match "ownership"
Test "external script rejected" -Path "/invitation-html" -Headers $H_ORG -Form @("file=@$htmlBad;type=text/html", "event_id=$EVENT_PUBLISHED_OPEN") -Status 422 -Match "errors"
Test "valid HTML, scanner configured" -Path "/invitation-html" -Headers $H_ORG -Form @("file=@$htmlOk;type=text/html", "event_id=$EVENT_PUBLISHED_OPEN") -Status 503 -Match "Scanner is unavailable" `
  -Note "Expected 503 locally: SCANNER_SUBMIT_URL / SCANNER_API_KEY / SCANNER_CALLBACK_URL are not set. If set, this uploads to storage and calls the scanner."

# =============================================================================
Section "html-scan-callback  POST /html-scan-callback  (scanner webhook)"
$cbUnknown = '{{"scan_id":"{0}","status":"passed"}}' -f $UNKNOWN_ID
Test "CORS preflight" -Method OPTIONS -Path "/html-scan-callback" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/html-scan-callback" -Headers $H_SVC -Status 405 -Match "METHOD_NOT_ALLOWED"
Test "invalid JSON" -Path "/html-scan-callback" -Headers $H_SVC -Body "{oops" -Status 400 -Match "INVALID_JSON"
Test "missing signature" -Path "/html-scan-callback" -Headers $H_ANON -Body $cbUnknown -Status 401 -Match "signature"
Test "wrong signature" -Path "/html-scan-callback" -Headers ($H_ANON + @{ "x-scanner-signature" = "sha256=deadbeef" }) -Body $cbUnknown -Status 401 -Match "signature"
Test "missing scan_id" -Path "/html-scan-callback" -Headers $H_SVC -Body '{"status":"passed"}' -Status 400 -Match "scan_id is required"
Test "invalid status" -Path "/html-scan-callback" -Headers $H_SVC -Body ('{{"scan_id":"{0}","status":"maybe"}}' -f $UNKNOWN_ID) -Status 400 -Match "INVALID_STATUS"
Test "unknown scan_id" -Path "/html-scan-callback" -Headers $H_SVC -Body $cbUnknown -Status 404 -Match "NOT_FOUND"
if ($WEBHOOK_SECRET) {
  $sig = Get-HmacHex -Body $cbUnknown -Secret $WEBHOOK_SECRET
  Test "valid HMAC signature accepted" -Path "/html-scan-callback" -Headers ($H_ANON + @{ "x-scanner-signature" = "sha256=$sig" }) -Body $cbUnknown -Status 404 -Match "NOT_FOUND"
  Test "webhook reachable without a Supabase JWT" -Path "/html-scan-callback" -Headers @{ "x-scanner-signature" = "sha256=$sig" } -Body $cbUnknown -Status 404 -Match "NOT_FOUND" `
    -Note "External scanners send no Supabase JWT. Needs [functions.html-scan-callback] verify_jwt = false in config.toml."
  Test "hard-coded test signature rejected when secret is set" -Path "/html-scan-callback" -Headers ($H_ANON + @{ "x-scanner-signature" = "test-signature" }) -Body $cbUnknown -Status 401 -Match "signature" `
    -Note "Hard-coded test signatures must always be rejected (401 when secret is set; 500 FUNCTION_NOT_CONFIGURED when SCANNER_WEBHOOK_SECRET is unset)."
} else {
  Skip "HMAC signature cases" "SCANNER_WEBHOOK_SECRET not found in supabase/.env.local"
}

# =============================================================================
Section "attendees  POST /attendees/{id}/decision  (event organizer)"
Test "CORS preflight" -Method OPTIONS -Path "/attendees/$ATT_PENDING/decision" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/attendees/$ATT_PENDING/decision" -Headers $H_ORG -Status 405 -Match "Method Not Allowed"
Test "no Authorization header" -Path "/attendees/$ATT_PENDING/decision" -Headers $H_NONE -Body '{"decision":"approve"}' -Status 401 -Match $AUTH_REJECTED
Test "attendee id not a UUID" -Path "/attendees/abc/decision" -Headers $H_ORG -Body '{"decision":"approve"}' -Status 400 -Match "attendee ID"
Test "invalid JSON" -Path "/attendees/$ATT_PENDING/decision" -Headers $H_ORG -Body "{oops" -Status 400 -Match "valid JSON"
Test "decision 'approved' (wrong enum)" -Path "/attendees/$ATT_PENDING/decision" -Headers $H_ORG -Body '{"decision":"approved"}' -Status 400 -Match "approve or reject"
Test "override_capacity not boolean" -Path "/attendees/$ATT_PENDING/decision" -Headers $H_ORG -Body '{"decision":"approve","override_capacity":"yes"}' -Status 400 -Match "override_capacity"
Test "unknown attendee" -Path "/attendees/$UNKNOWN_ID/decision" -Headers $H_ORG -Body '{"decision":"approve"}' -Status 404 -Match "not found"
Test "other organizer forbidden" -Path "/attendees/$ATT_PENDING/decision" -Headers $H_ORG2 -Body '{"decision":"approve"}' -Status 403 -Match "Forbidden"
Test "guest forbidden" -Path "/attendees/$ATT_PENDING/decision" -Headers $H_GUEST -Body '{"decision":"approve"}' -Status 403 -Match "Forbidden"
Test "already-approved attendee" -Path "/attendees/$ATT_APPROVED/decision" -Headers $H_ORG -Body '{"decision":"reject"}' -Status 409 -Match "not pending"

# =============================================================================
Section "headcount-requests  POST /headcount-requests/{id}/decision  (event organizer)"
Test "CORS preflight" -Method OPTIONS -Path "/headcount-requests/$HC_PENDING/decision" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/headcount-requests/$HC_PENDING/decision" -Headers $H_ORG -Status 405 -Match "METHOD_NOT_ALLOWED"
Test "no Authorization header" -Path "/headcount-requests/$HC_PENDING/decision" -Headers $H_NONE -Body '{"decision":"approve"}' -Status 401 -Match $AUTH_REJECTED
Test "request id not a UUID" -Path "/headcount-requests/abc/decision" -Headers $H_ORG -Body '{"decision":"approve"}' -Status 400 -Match "headcount request ID"
Test "invalid JSON" -Path "/headcount-requests/$HC_PENDING/decision" -Headers $H_ORG -Body "{oops" -Status 400 -Match "INVALID_JSON"
Test "decision 'approved' (wrong enum)" -Path "/headcount-requests/$HC_PENDING/decision" -Headers $H_ORG -Body '{"decision":"approved"}' -Status 400 -Match "approve' or 'reject"
Test "unknown request" -Path "/headcount-requests/$UNKNOWN_ID/decision" -Headers $H_ORG -Body '{"decision":"approve"}' -Status 404 -Match "NOT_FOUND"
Test "other organizer forbidden" -Path "/headcount-requests/$HC_PENDING/decision" -Headers $H_ORG2 -Body '{"decision":"approve"}' -Status 403 -Match "FORBIDDEN"
Test "guest forbidden" -Path "/headcount-requests/$HC_PENDING/decision" -Headers $H_GUEST -Body '{"decision":"approve"}' -Status 403 -Match "FORBIDDEN"
Test "already-decided request" -Path "/headcount-requests/$HC_APPROVED/decision" -Headers $H_ORG -Body '{"decision":"reject"}' -Status 409 -Match "ALREADY_DECIDED"

# =============================================================================
Section "submit-headcount-request  POST /submit-headcount-request  (guest)"
Test "CORS preflight" -Method OPTIONS -Path "/submit-headcount-request" -Headers $H_NONE -Status 200
Test "GET not allowed" -Method GET -Path "/submit-headcount-request" -Headers $H_GUEST -Status 405 -Match "METHOD_NOT_ALLOWED"
Test "no Authorization header" -Path "/submit-headcount-request" -Headers $H_NONE -Body "{}" -Status 401 -Match $AUTH_REJECTED
Test "invalid JSON" -Path "/submit-headcount-request" -Headers $H_GUEST -Body "{oops" -Status 400 -Match "INVALID_JSON"
Test "missing fields" -Path "/submit-headcount-request" -Headers $H_GUEST -Body "{}" -Status 400 -Match "INVALID_REQUEST"
Test "requested_additional_heads = 0" -Path "/submit-headcount-request" -Headers $H_GUEST -Body ('{{"invitation_id":"{0}","requested_additional_heads":0}}' -f $INV_ACCEPTED) -Status 400 -Match "INVALID_REQUEST"
Test "requested_additional_heads = 1.5" -Path "/submit-headcount-request" -Headers $H_GUEST -Body ('{{"invitation_id":"{0}","requested_additional_heads":1.5}}' -f $INV_ACCEPTED) -Status 400 -Match "INVALID_REQUEST"
Test "note not a string" -Path "/submit-headcount-request" -Headers $H_GUEST -Body ('{{"invitation_id":"{0}","requested_additional_heads":1,"note":5}}' -f $INV_ACCEPTED) -Status 400 -Match "INVALID_REQUEST"
Test "garbage JWT" -Path "/submit-headcount-request" -Headers $H_BAD -Body ('{{"invitation_id":"{0}","requested_additional_heads":1}}' -f $INV_ACCEPTED) -Status 401 -Match $AUTH_REJECTED
Test "another guest's invitation" -Path "/submit-headcount-request" -Headers $H_GUEST -Body ('{{"invitation_id":"{0}","requested_additional_heads":1}}' -f $INV_ACCEPTED) -Status 403 -Match "FORBIDDEN"

# =============================================================================
if ($IncludeMutations) {
  Section "checkin  end-to-end scan (MUTATES: attendee $ATT_APPROVED)"
  if (-not $QR_SECRET) {
    Skip "check-in flow" "QR_SIGNING_SECRET not found in supabase/.env.local"
  } else {
    $token = New-QrToken -AttendeeId $ATT_APPROVED -EventId $EVENT_PUBLISHED_OPEN -InvitationId $INV_ACCEPTED
    $restHeaders = @{ apikey = $SERVICE; Authorization = "Bearer $SERVICE"; Prefer = "return=minimal" }
    $set = Invoke-Api -Method PATCH -Url "$BaseUrl/rest/v1/attendees?id=eq.$ATT_APPROVED" -Headers $restHeaders -Body ('{{"qr_token":"{0}"}}' -f $token)
    if ($set.Status -ge 300) {
      Skip "check-in flow" "could not stage QR token ($($set.Status)): $($set.Body)"
    } else {
      $scanBody = '{{"qr_token":"{0}","event_id":"{1}"}}' -f $token, $EVENT_PUBLISHED_OPEN
      Test "staff blocked outside event day" -Path "/checkin/scan" -Headers $H_STAFF -Body $scanBody -Status 403 -Match "FORBIDDEN|Forbidden"
      Test "other organizer blocked" -Path "/checkin/scan" -Headers $H_ORG2 -Body $scanBody -Status 403 -Match "FORBIDDEN|Forbidden"
      Test "organizer scan accepted" -Path "/checkin/scan" -Headers $H_ORG -Body $scanBody -Status 200 -Match '"result":"accepted"'
      Test "second scan is idempotent" -Path "/checkin/scan" -Headers $H_ORG -Body $scanBody -Status 200 -Match '"result":"already_checked_in"'
      $restore = Invoke-Api -Method PATCH -Url "$BaseUrl/rest/v1/attendees?id=eq.$ATT_APPROVED" -Headers $restHeaders `
        -Body '{"qr_token":"token-secondary-002","checked_in":false,"checked_in_at":null,"checked_in_by":null}'
      if ($restore.Status -ge 300) { Write-Host "  WARN  restore failed ($($restore.Status)); run 'supabase db reset'." -ForegroundColor Yellow }
    }
  }
}

# =============================================================================
Write-Host "`n=================== SUMMARY ===================" -ForegroundColor Cyan
$results | Group-Object Fn | ForEach-Object {
  $p = @($_.Group | Where-Object { $_.Pass -eq $true }).Count
  $f = @($_.Group | Where-Object { $_.Pass -eq $false }).Count
  $s = @($_.Group | Where-Object { $_.Pass -eq $null }).Count
  $color = if ($f) { "Red" } else { "Green" }
  Write-Host ("{0,-4} pass  {1,-3} fail  {2,-3} skip   {3}" -f $p, $f, $s, $_.Name) -ForegroundColor $color
}
$failed = @($results | Where-Object { $_.Pass -eq $false })
$passed = @($results | Where-Object { $_.Pass -eq $true }).Count
Write-Host ("`nTotal: {0} passed, {1} failed, {2} skipped" -f $passed, $failed.Count, @($results | Where-Object { $_.Pass -eq $null }).Count)

if ($failed.Count) {
  Write-Host "`nFailures:" -ForegroundColor Red
  $failed | ForEach-Object {
    Write-Host ("  [{0}] {1}: got {2}, expected {3}" -f ($_.Fn -split '\s')[0], $_.Name, $_.Status, $_.Expected) -ForegroundColor Red
    if ($_.Note) { Write-Host "      $($_.Note)" -ForegroundColor DarkYellow }
  }
  exit 1
}
