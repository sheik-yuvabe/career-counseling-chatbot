$ErrorActionPreference = "Stop"

$sourcePath = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\docs\module-3-knowledge-presentation.pptx")
)
$compatiblePptxPath = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\docs\module-3-knowledge-presentation-compatible.pptx")
)
$legacyPptPath = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\docs\module-3-knowledge-presentation-legacy.ppt")
)

if (-not (Test-Path -LiteralPath $sourcePath)) {
  throw "Presentation not found: $sourcePath"
}

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1
$presentation = $null
$validationCopy = $null

try {
  $presentation = $powerPoint.Presentations.Open($sourcePath, 0, 0, 0)

  foreach ($path in @($compatiblePptxPath, $legacyPptPath)) {
    if (Test-Path -LiteralPath $path) {
      Remove-Item -LiteralPath $path
    }
  }

  # 24 = Open XML Presentation (.pptx); 1 = PowerPoint 97-2003 Presentation (.ppt).
  $presentation.SaveCopyAs($compatiblePptxPath, 24)
  $presentation.SaveCopyAs($legacyPptPath, 1)
  $presentation.Close()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
  $presentation = $null

  # Reopen the compatibility copy to prove PowerPoint can parse it.
  $validationCopy = $powerPoint.Presentations.Open($compatiblePptxPath, 1, 0, 0)
  $slideCount = $validationCopy.Slides.Count
  if ($slideCount -ne 20) {
    throw "Compatibility presentation has $slideCount slides; expected 20"
  }
  Write-Output "Validated $compatiblePptxPath with $slideCount slides"
  Write-Output "Created $legacyPptPath"
}
finally {
  if ($null -ne $validationCopy) {
    $validationCopy.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($validationCopy) | Out-Null
  }
  if ($null -ne $presentation) {
    $presentation.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
  }
  $powerPoint.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
