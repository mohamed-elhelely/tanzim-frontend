# Synthesizes one WAV per slide with the Windows (OneCore) voices installed on this machine. Runs offline.
# Usage: powershell -File tts.ps1 -Json slides.json -Lang ar -OutDir work\ar [-Voice "Microsoft Hoda"] [-Rate 1.0]
param(
  [Parameter(Mandatory = $true)][string]$Json,
  [Parameter(Mandatory = $true)][ValidateSet('en', 'ar')][string]$Lang,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [string]$Voice = '',
  [double]$Rate = 1.0
)
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$null = [Windows.Media.SpeechSynthesis.SpeechSynthesizer, Windows.Media.SpeechSynthesis, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.DataReader, Windows.Storage.Streams, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1' })[0]
function Await($op, [Type]$type) { $task = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $task.Wait(); $task.Result }

$all = [Windows.Media.SpeechSynthesis.SpeechSynthesizer]::AllVoices
if ($Voice) { $v = $all | Where-Object { $_.DisplayName -eq $Voice } | Select-Object -First 1 }
elseif ($Lang -eq 'ar') { $v = $all | Where-Object { $_.Language -like 'ar-*' } | Select-Object -First 1 }
else { $v = @($all | Where-Object { $_.DisplayName -eq 'Microsoft Mark' }) + @($all | Where-Object { $_.Language -like 'en-*' }) | Select-Object -First 1 }
if (-not $v) { throw "No installed voice for '$Lang'. Add the language's speech pack in Windows Settings > Time & language > Speech." }
Write-Host "Voice: $($v.DisplayName) ($($v.Language))"

$synth = New-Object Windows.Media.SpeechSynthesis.SpeechSynthesizer
$synth.Voice = $v
try { $synth.Options.SpeakingRate = $Rate } catch { }
New-Item -ItemType Directory -Force $OutDir | Out-Null

$slides = Get-Content -Raw -Encoding UTF8 $Json | ConvertFrom-Json
foreach ($s in $slides) {
  $text = $s.$Lang
  if (-not $text) { continue }
  $file = Join-Path $OutDir ('{0:D2}-{1}.wav' -f $s.n, $s.id)
  $stream = Await ($synth.SynthesizeTextToStreamAsync($text)) ([Windows.Media.SpeechSynthesis.SpeechSynthesisStream])
  $reader = New-Object Windows.Storage.Streams.DataReader($stream.GetInputStreamAt(0))
  $count = Await ($reader.LoadAsync([uint32]$stream.Size)) ([uint32])
  $bytes = New-Object byte[] $count
  $reader.ReadBytes($bytes)
  [IO.File]::WriteAllBytes($file, $bytes)
  $reader.Dispose(); $stream.Dispose()
  Write-Host ("{0:D2} {1}" -f $s.n, $s.id)
}
