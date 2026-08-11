$ErrorActionPreference = "Stop"

$pptxPath = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\docs\module-3-complete-table-api-flow-v3.pptx")
)
$pdfPath = [System.IO.Path]::GetFullPath(
  (Join-Path $PSScriptRoot "..\docs\module-3-complete-table-api-flow-v3.pdf")
)

if (-not (Test-Path -LiteralPath $pptxPath)) {
  throw "Presentation not found: $pptxPath"
}

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1
$presentation = $null

try {
  $presentation = $powerPoint.Presentations.Open($pptxPath, 1, 0, 0)
  if (Test-Path -LiteralPath $pdfPath) {
    Remove-Item -LiteralPath $pdfPath
  }
  $presentation.SaveAs($pdfPath, 32)
  Write-Output $pdfPath
}
finally {
  if ($null -ne $presentation) {
    $presentation.Close()
    [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
  }
  $powerPoint.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
