# ============================================================
# SLZB - Vplan GitHub Upload Script (PowerShell)
# ============================================================
param(
  [string]$Token,
  [string]$Repo,
  [string]$Branch = "main",
  [string]$HeutePfad,
  [string]$MorgenPfad,
  [string]$UebersichtPfad,
  [string]$GithubHeutePfad = "slzb-v3/vplan-heute.html",
  [string]$GithubMorgenPfad = "slzb-v3/vplan-morgen.html",
  [string]$GithubUebersichtPfad = "slzb-v3/vplan-index.html"
)

$ErrorActionPreference = "Stop"
$BaseUrl = "https://api.github.com/repos/$Repo/contents"
$Headers = @{
  "Authorization" = "token $Token"
  "Accept"        = "application/vnd.github.v3+json"
  "User-Agent"    = "SLZB-Vplan-Upload"
}

function Upload-Datei {
  param([string]$LocalPath, [string]$GithubPath, [string]$Beschreibung)
  
  if (-not (Test-Path $LocalPath)) {
    Write-Host "  WARNUNG: $Beschreibung nicht gefunden: $LocalPath"
    return
  }
  
  Write-Host "  Lade hoch: $Beschreibung..."
  
  # Datei lesen und Base64 kodieren
  $Inhalt = Get-Content -Path $LocalPath -Raw -Encoding UTF8
  $Base64 = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($Inhalt))
  
  # Prüfe ob Datei bereits existiert (für SHA)
  $Url = "$BaseUrl/$GithubPath"
  $Sha = $null
  try {
    $Existing = Invoke-RestMethod -Uri $Url -Headers $Headers -Method Get
    $Sha = $Existing.sha
    Write-Host "    Datei existiert, wird aktualisiert (SHA: $($Sha.Substring(0,8))...)"
  } catch {
    Write-Host "    Neue Datei wird erstellt"
  }
  
  # Upload-Body
  $Datum = Get-Date -Format "dd.MM.yyyy HH:mm"
  $Body = @{
    message = "Vplan-Update: $Beschreibung ($Datum)"
    content = $Base64
    branch  = $Branch
  }
  if ($Sha) { $Body.sha = $Sha }
  
  $BodyJson = $Body | ConvertTo-Json
  
  # Upload
  Invoke-RestMethod -Uri $Url -Headers $Headers -Method Put -Body $BodyJson -ContentType "application/json"
  Write-Host "    OK: $GithubPath"
}

Write-Host "=== SLZB Vplan-Upload ==="
Write-Host "Repository: $Repo"
Write-Host "Branch: $Branch"
Write-Host ""

Upload-Datei -LocalPath $HeutePfad      -GithubPath $GithubHeutePfad      -Beschreibung "Heute"
Upload-Datei -LocalPath $MorgenPfad     -GithubPath $GithubMorgenPfad     -Beschreibung "Morgen"
Upload-Datei -LocalPath $UebersichtPfad -GithubPath $GithubUebersichtPfad -Beschreibung "Uebersicht"

Write-Host ""
Write-Host "=== Upload abgeschlossen ==="
Write-Host "Seite verfuegbar unter:"
Write-Host "https://pfeiffse.github.io/slzb-erfolge/slzb-v3/splitscreen.html"
