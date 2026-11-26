@echo off
REM ============================================================
REM SLZB - AccessSchule → GitHub Auto-Upload
REM Dieses Skript in AccessSchule als "Nach-Export-Aktion" eintragen
REM oder als geplante Aufgabe in Windows einrichten
REM ============================================================

REM Konfiguration - ANPASSEN:
set GITHUB_TOKEN=github_pat_XXXX_IHR_TOKEN_HIER
set GITHUB_REPO=pfeiffse/slzb-erfolge
set GITHUB_BRANCH=main

REM Pfade zu den AccessSchule-Export-Dateien - ANPASSEN:
set VPLAN_HEUTE=C:\AccessSchule\Export\heute.html
set VPLAN_MORGEN=C:\AccessSchule\Export\morgen.html
set VPLAN_UEBERSICHT=C:\AccessSchule\Export\index.html

REM Ziel-Pfade in GitHub:
set GITHUB_PATH_HEUTE=slzb-v3/vplan-heute.html
set GITHUB_PATH_MORGEN=slzb-v3/vplan-morgen.html
set GITHUB_PATH_UEBERSICHT=slzb-v3/vplan-index.html

echo [%date% %time%] Starte Vplan-Upload...

REM PowerShell für den Upload verwenden
powershell -ExecutionPolicy Bypass -File "%~dp0upload_vplan.ps1" ^
  -Token "%GITHUB_TOKEN%" ^
  -Repo "%GITHUB_REPO%" ^
  -Branch "%GITHUB_BRANCH%" ^
  -HeutePfad "%VPLAN_HEUTE%" ^
  -MorgenPfad "%VPLAN_MORGEN%" ^
  -UebersichtPfad "%VPLAN_UEBERSICHT%" ^
  -GithubHeutePfad "%GITHUB_PATH_HEUTE%" ^
  -GithubMorgenPfad "%GITHUB_PATH_MORGEN%" ^
  -GithubUebersichtPfad "%GITHUB_PATH_UEBERSICHT%"

if %ERRORLEVEL% == 0 (
  echo [%date% %time%] Upload erfolgreich!
) else (
  echo [%date% %time%] FEHLER beim Upload!
)
