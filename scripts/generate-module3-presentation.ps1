$ErrorActionPreference = "Stop"

$outputPath = Join-Path $PSScriptRoot "..\docs\module-3-complete-table-api-flow-v3.pptx"
$outputPath = [System.IO.Path]::GetFullPath($outputPath)

$green = 0x286F1E
$darkGreen = 0x294D0B
$mint = 0xE6F4ED
$light = 0xF7FAF8
$dark = 0x25342B
$muted = 0x6B7D73
$orange = 0x2A76D9
$white = 0xFFFFFF
$blue = 0xD86A35

function Add-TextBox {
  param($slide, [string]$text, [double]$left, [double]$top, [double]$width, [double]$height,
        [double]$size = 22, [int]$color = 0x25342B, [bool]$bold = $false, [int]$align = 1)
  $shape = $slide.Shapes.AddTextbox(1, $left, $top, $width, $height)
  $shape.TextFrame.TextRange.Text = $text
  $shape.TextFrame.TextRange.Font.Name = "Aptos"
  $shape.TextFrame.TextRange.Font.Size = $size
  $shape.TextFrame.TextRange.Font.Color.RGB = $color
  $shape.TextFrame.TextRange.Font.Bold = [int]$bold
  $shape.TextFrame.TextRange.ParagraphFormat.Alignment = $align
  $shape.TextFrame.MarginLeft = 4
  $shape.TextFrame.MarginRight = 4
  $shape.TextFrame.MarginTop = 2
  $shape.TextFrame.MarginBottom = 2
  return $shape
}

function Add-Box {
  param($slide, [string]$text, [double]$left, [double]$top, [double]$width, [double]$height,
        [int]$fill = 0xE6F4ED, [int]$line = 0x286F1E, [double]$size = 18)
  $shape = $slide.Shapes.AddShape(5, $left, $top, $width, $height)
  $shape.Fill.ForeColor.RGB = $fill
  $shape.Line.ForeColor.RGB = $line
  $shape.Line.Weight = 1.5
  $shape.TextFrame.TextRange.Text = $text
  $shape.TextFrame.TextRange.Font.Name = "Aptos"
  $shape.TextFrame.TextRange.Font.Size = $size
  $shape.TextFrame.TextRange.Font.Color.RGB = $dark
  $shape.TextFrame.TextRange.Font.Bold = -1
  $shape.TextFrame.TextRange.ParagraphFormat.Alignment = 2
  $shape.TextFrame.VerticalAnchor = 3
  return $shape
}

function Add-Header {
  param($slide, [string]$title, [string]$section = "MODULE 3 | KNOWLEDGE")
  $bar = $slide.Shapes.AddShape(1, 0, 0, 960, 42)
  $bar.Fill.ForeColor.RGB = $darkGreen
  $bar.Line.Visible = 0
  Add-TextBox $slide $section 36 10 350 24 11 $white $true | Out-Null
  Add-TextBox $slide $title 44 60 870 48 28 $dark $true | Out-Null
  $rule = $slide.Shapes.AddShape(1, 44, 114, 78, 5)
  $rule.Fill.ForeColor.RGB = $green
  $rule.Line.Visible = 0
}

function Add-Footer {
  param($slide, [int]$number)
  Add-TextBox $slide "YuvaNext Phase A POC" 44 512 250 18 10 $muted $false | Out-Null
  Add-TextBox $slide ([string]$number) 890 512 28 18 10 $muted $true 3 | Out-Null
}

function Add-Bullets {
  param($slide, [string[]]$items, [double]$left = 62, [double]$top = 145,
        [double]$width = 820, [double]$height = 330, [double]$size = 22)
  $text = ($items | ForEach-Object { "-  $_" }) -join "`r`n"
  $box = Add-TextBox $slide $text $left $top $width $height $size $dark $false
  $box.TextFrame.TextRange.ParagraphFormat.SpaceAfter = 11
  return $box
}

function Add-Arrow {
  param($slide, [double]$x1, [double]$y1, [double]$x2, [double]$y2)
  $line = $slide.Shapes.AddLine($x1, $y1, $x2, $y2)
  $line.Line.ForeColor.RGB = $green
  $line.Line.Weight = 2.5
  $line.Line.EndArrowheadStyle = 3
}

$powerPoint = New-Object -ComObject PowerPoint.Application
$powerPoint.Visible = -1
$presentation = $powerPoint.Presentations.Add()
$presentation.PageSetup.SlideSize = 15

try {
  $slides = @()
  1..23 | ForEach-Object { $slides += $presentation.Slides.Add($_, 12) }
  foreach ($slide in $slides) {
    $background = $slide.Shapes.AddShape(1, 0, 0, 960, 540)
    $background.Fill.ForeColor.RGB = $light
    $background.Line.Visible = 0
    $background.ZOrder(1)
  }

  # 1 - Title
  $hero = $slides[0].Shapes.AddShape(1, 0, 0, 960, 540)
  $hero.Fill.ForeColor.RGB = $darkGreen
  $hero.Line.Visible = 0
  Add-TextBox $slides[0] "YUVANEXT" 58 62 300 28 14 $mint $true | Out-Null
  Add-TextBox $slides[0] "Grounded Knowledge`nPlatform" 58 128 650 120 42 $white $true | Out-Null
  Add-TextBox $slides[0] "Module 3 | Versioned, verified career and education data" 62 277 650 40 20 $mint $false | Out-Null
  Add-Box $slides[0] "Official sources -> Reviewed data -> Safe APIs" 62 365 560 58 $mint $mint 18 | Out-Null
  Add-TextBox $slides[0] "Phase A Career-Counselling POC" 62 475 500 24 13 $mint $false | Out-Null

  # 2
  Add-Header $slides[1] "My responsibility"
  Add-Bullets $slides[1] @(
    "Own the trusted career and education catalog",
    "Ingest, validate, version and publish approved datasets",
    "Expose typed APIs to Recommendations and the AI Counsellor",
    "Prevent invented colleges, salaries, links and eligibility facts"
  ) 62 150 820 290 24 | Out-Null
  Add-Footer $slides[1] 2

  # 3
  Add-Header $slides[2] "Why this module exists"
  Add-Box $slides[2] "Uncontrolled AI output" 60 175 230 78 0xE9E5FF $orange 19 | Out-Null
  Add-Arrow $slides[2] 300 214 380 214
  Add-Box $slides[2] "Module 3`nreview gate" 390 160 180 108 $mint $green 20 | Out-Null
  Add-Arrow $slides[2] 580 214 660 214
  Add-Box $slides[2] "Traceable student`nanswer" 670 175 230 78 0xEEF5FF $blue 19 | Out-Null
  Add-TextBox $slides[2] "The model explains stored facts; it does not create them." 170 330 620 45 25 $dark $true 2 | Out-Null
  Add-Footer $slides[2] 3

  # 4
  Add-Header $slides[3] "End-to-end data flow"
  $flow = @("Official`nsources", "Raw source`nfiles", "Validation`n+ review", "Versioned`ndataset", "Supabase", "Knowledge`nAPIs")
  for ($i = 0; $i -lt $flow.Count; $i++) {
    $x = 35 + ($i * 154)
    Add-Box $slides[3] $flow[$i] $x 190 125 82 $mint $green 16 | Out-Null
    if ($i -lt $flow.Count - 1) { Add-Arrow $slides[3] ($x + 126) 231 ($x + 151) 231 }
  }
  Add-TextBox $slides[3] "Every published answer remains connected to its source and dataset version." 105 340 750 48 22 $dark $true 2 | Out-Null
  Add-Footer $slides[3] 4

  # 5
  Add-Header $slides[4] "Trusted data sources"
  $sources = @(
    @("Careers + RIASEC", "O*NET"), @("Indian occupation codes", "NCO / DGE"),
    @("TN colleges + programmes", "TNDCE"), @("TN school groups", "Tamil Nadu DGE"),
    @("Scholarships", "Government portals"), @("Vocational qualifications", "NCVET / NQR")
  )
  for ($i = 0; $i -lt $sources.Count; $i++) {
    $col = $i % 2; $row = [math]::Floor($i / 2)
    $x = 65 + ($col * 430); $y = 145 + ($row * 105)
    Add-Box $slides[4] ($sources[$i][0] + "`n" + $sources[$i][1]) $x $y 385 78 $mint $green 17 | Out-Null
  }
  Add-Footer $slides[4] 5

  # 6
  Add-Header $slides[5] "Where the files live"
  Add-Box $slides[5] "data/raw/`nAppend-only source captures" 70 165 360 105 $mint $green 20 | Out-Null
  Add-Box $slides[5] "data/seed/knowledge/`nReviewed import artifacts" 530 165 360 105 0xEEF5FF $blue 20 | Out-Null
  Add-TextBox $slides[5] "Examples" 75 320 150 26 17 $muted $true | Out-Null
  Add-TextBox $slides[5] "O*NET | NCO | TNDCE | TN DGE" 75 355 350 60 19 $dark $false | Out-Null
  Add-TextBox $slides[5] "manifest.json | records JSON | checksum" 535 355 350 60 19 $dark $false | Out-Null
  Add-Footer $slides[5] 6

  # 7
  Add-Header $slides[6] "Validation and review gate"
  Add-Bullets $slides[6] @(
    "Required fields, stable UUIDs and valid URLs",
    "Duplicate and orphan-reference detection",
    "RIASEC values constrained to 0-1",
    "Verified college and reviewed career-profile status",
    "SHA-256 checksum and transactional import",
    "Unsupported facts remain NULL - not guessed"
  ) 60 140 825 340 21 | Out-Null
  Add-Footer $slides[6] 7

  # 8
  Add-Header $slides[7] "Versioning and checksum"
  Add-Box $slides[7] "manifest.json" 70 160 220 76 $mint $green 21 | Out-Null
  Add-Arrow $slides[7] 300 198 390 198
  Add-Box $slides[7] "SHA-256`nfingerprint" 400 150 190 96 0xFFF3E8 $orange 20 | Out-Null
  Add-Arrow $slides[7] 600 198 690 198
  Add-Box $slides[7] "dataset_versions" 700 160 210 76 0xEEF5FF $blue 20 | Out-Null
  Add-Bullets $slides[7] @(
    "Detects unexpected file changes",
    "Makes imports repeatable and auditable",
    "Shows exactly which version powered an API response"
  ) 115 320 730 140 19 | Out-Null
  Add-Footer $slides[7] 8

  # 9
  Add-Header $slides[8] "Database architecture"
  Add-Box $slides[8] "knowledge_sources" 360 135 240 52 $mint $green 18 | Out-Null
  Add-Arrow $slides[8] 480 190 480 225
  Add-Box $slides[8] "dataset_versions" 360 230 240 52 0xEEF5FF $blue 18 | Out-Null
  Add-Arrow $slides[8] 480 285 480 320
  $entities = @("careers", "pathways", "colleges", "aid_schemes")
  for ($i = 0; $i -lt 4; $i++) { Add-Box $slides[8] $entities[$i] (65 + $i * 225) 330 185 58 $white $green 16 | Out-Null }
  Add-TextBox $slides[8] "Child tables store RIASEC, profiles, programmes, criteria and mappings." 150 435 660 38 18 $muted $false 2 | Out-Null
  Add-Footer $slides[8] 9

  # 10
  Add-Header $slides[9] "Career relationship model"
  Add-Box $slides[9] "careers" 390 135 180 58 $darkGreen $darkGreen 20 | Out-Null
  $children = @("career_interest_profiles", "career_value_profiles", "career_profiles", "career_pathways -> pathways -> education_routes")
  for ($i = 0; $i -lt 4; $i++) {
    $x = 55 + $i * 225
    Add-Arrow $slides[9] 480 198 ($x + 90) 290
    Add-Box $slides[9] $children[$i] $x 300 190 75 $mint $green 15 | Out-Null
  }
  Add-TextBox $slides[9] "career_pathways is a crosswalk - not a master-data table." 170 430 620 38 20 $dark $true 2 | Out-Null
  Add-Footer $slides[9] 10

  # 11
  Add-Header $slides[10] "Reviewed career-to-pathway crosswalk"
  Add-Bullets $slides[10] @(
    "7 pathways derived from official TNDCE programme listings",
    "16 mappings connect stable O*NET careers to those pathways",
    "Relationships are labelled primary, related or foundation",
    "Mappings are project-reviewed guidance - not admission guarantees"
  ) 62 145 820 255 22 | Out-Null
  Add-Box $slides[10] "Accountants and Auditors -> B.Com General (primary)" 135 420 690 55 0xFFF3E8 $orange 17 | Out-Null
  Add-Footer $slides[10] 11

  # 12
  Add-Header $slides[11] "Stream tables: RIASEC to school options"
  Add-Box $slides[11] "stream_maps`ntopTwo + segment + version" 80 175 240 82 $mint $green 16 | Out-Null
  Add-Arrow $slides[11] 325 216 405 216
  Add-Box $slides[11] "stream_map_items`nrank + reason" 415 175 220 82 0xFFF3E8 $orange 16 | Out-Null
  Add-Arrow $slides[11] 640 216 720 216
  Add-Box $slides[11] "stream_options`napproved stream details" 730 175 180 82 0xEEF5FF $blue 15 | Out-Null
  Add-Bullets $slides[11] @(
    "Input: topTwo = RI and segment = explorer",
    "Output: ordered, approved stream choices",
    "Endpoint: GET /api/v1/catalog/streams"
  ) 175 330 630 130 18 | Out-Null
  Add-Footer $slides[11] 12

  # 13
  Add-Header $slides[12] "College and programme table flow"
  Add-Box $slides[12] "colleges" 65 155 180 58 $mint $green 18 | Out-Null
  Add-Arrow $slides[12] 250 184 325 184
  Add-Box $slides[12] "college_programs" 335 155 220 58 0xEEF5FF $blue 17 | Out-Null
  Add-Arrow $slides[12] 560 184 635 184
  Add-Box $slides[12] "disciplines" 645 155 190 58 $mint $green 18 | Out-Null
  Add-Arrow $slides[12] 740 218 740 290
  Add-Box $slides[12] "pathway_disciplines" 625 300 230 58 0xFFF3E8 $orange 17 | Out-Null
  Add-Arrow $slides[12] 620 329 545 329
  Add-Box $slides[12] "pathways" 355 300 180 58 $mint $green 18 | Out-Null
  Add-TextBox $slides[12] "GET /colleges filters verified colleges by state and optionally by pathway or discipline." 115 425 730 42 18 $dark $true 2 | Out-Null
  Add-Footer $slides[12] 13

  # 14
  Add-Header $slides[13] "Aid tables and all 18-table coverage"
  Add-Box $slides[13] "aid_schemes`nverified scheme facts" 170 145 250 72 $mint $green 18 | Out-Null
  Add-Arrow $slides[13] 425 181 535 181
  Add-Box $slides[13] "aid_criteria`nincome/category rules" 545 145 250 72 0xFFF3E8 $orange 18 | Out-Null
  Add-TextBox $slides[13] "Complete knowledge schema" 65 280 250 28 17 $muted $true | Out-Null
  Add-TextBox $slides[13] "Sources/version (2)  +  career/education (7)  +  streams (3)  +  colleges (4)  +  aid (2)  =  18 tables" 75 325 810 70 22 $dark $true 2 | Out-Null
  Add-TextBox $slides[13] "GET /aid-schemes reads verified schemes and applies stored criteria filters." 150 430 660 35 18 $dark $false 2 | Out-Null
  Add-Footer $slides[13] 14

  # 15
  Add-Header $slides[14] "API architecture"
  $apis = @(
    "GET /catalog/datasets", "GET /catalog/careers/search",
    "GET /catalog/careers/{slug}", "GET /catalog/streams",
    "GET /catalog/colleges", "GET /catalog/aid-schemes",
    "POST /internal/catalog/imports", "GET /internal/catalog/imports/{id}/report"
  )
  for ($i = 0; $i -lt $apis.Count; $i++) {
    $col = $i % 2; $row = [math]::Floor($i / 2)
    Add-Box $slides[14] $apis[$i] (55 + $col * 455) (130 + $row * 84) 405 58 $white $green 14 | Out-Null
  }
  Add-Footer $slides[14] 15

  # 16
  Add-Header $slides[15] "How the modules work together"
  $modules = @("1`nAssessment", "2`nRecommendations", "3`nKnowledge", "4`nAI Counsellor", "5`nSafety")
  for ($i = 0; $i -lt $modules.Count; $i++) {
    $x = 40 + $i * 184
    $fill = if ($i -eq 2) { $darkGreen } else { $mint }
    $line = if ($i -eq 2) { $darkGreen } else { $green }
    Add-Box $slides[15] $modules[$i] $x 205 145 88 $fill $line 17 | Out-Null
    if ($i -lt 4) { Add-Arrow $slides[15] ($x + 147) 249 ($x + 181) 249 }
  }
  Add-TextBox $slides[15] "The AI receives bounded tool results - not direct database access." 150 365 660 45 22 $dark $true 2 | Out-Null
  Add-Footer $slides[15] 16

  # 17
  Add-Header $slides[16] "Current verified result"
  $metrics = @(@("32", "official O*NET careers"), @("0", "missing O*NET codes"), @("10", "official TN colleges"), @("10", "official aid schemes"), @("58", "passing tests"))
  for ($i = 0; $i -lt $metrics.Count; $i++) {
    $x = 35 + $i * 184
    Add-Box $slides[16] ($metrics[$i][0] + "`n" + $metrics[$i][1]) $x 190 155 105 $mint $green 17 | Out-Null
  }
  Add-TextBox $slides[16] "All published datasets carry source, version and checksum metadata." 140 370 680 42 22 $dark $true 2 | Out-Null
  Add-Footer $slides[16] 17

  # 18
  Add-Header $slides[17] "Swagger demonstration flow"
  $demoSteps = @("Start API", "Open /docs", "Public GETs", "Internal import", "Import report")
  for ($i = 0; $i -lt $demoSteps.Count; $i++) {
    $x = 35 + $i * 184
    Add-Box $slides[17] (($i + 1).ToString() + "`n" + $demoSteps[$i]) $x 190 150 88 $mint $green 17 | Out-Null
    if ($i -lt 4) { Add-Arrow $slides[17] ($x + 152) 234 ($x + 181) 234 }
  }
  Add-TextBox $slides[17] "Begin with read-only endpoints; finish with the authenticated, idempotent import." 110 350 740 54 21 $dark $true 2 | Out-Null
  Add-Footer $slides[17] 18

  # 19
  Add-Header $slides[18] "Public endpoint parameters"
  Add-TextBox $slides[18] "Endpoint" 55 135 345 28 15 $muted $true | Out-Null
  Add-TextBox $slides[18] "Swagger values" 430 135 470 28 15 $muted $true | Out-Null
  $publicRows = @(
    @("GET /datasets", "no parameters | dataset_versions + knowledge_sources"),
    @("GET /careers/search", "q=engineer | domain=engineering | limit=20 | careers"),
    @("GET /careers/{slug}", "slug=mechanical-engineers | careers + three profile tables"),
    @("GET /streams", "topTwo=RI | segment=explorer | three stream tables"),
    @("GET /colleges", "state=Tamil Nadu | optional filters empty | limit=20"),
    @("GET /aid-schemes", "state=Tamil Nadu | optional filters empty | limit=20")
  )
  for ($i = 0; $i -lt $publicRows.Count; $i++) {
    $y = 165 + $i * 53
    Add-Box $slides[18] $publicRows[$i][0] 55 $y 345 42 $white $green 13 | Out-Null
    Add-Box $slides[18] $publicRows[$i][1] 430 $y 470 42 $mint $green 11 | Out-Null
  }
  Add-Footer $slides[18] 19

  # 20
  Add-Header $slides[19] "Public parameter rules"
  Add-Bullets $slides[19] @(
    "Career search: q, domain and cursor optional; limit 1-50",
    "Career detail: slug required; lowercase letters, numbers and hyphens",
    "Streams: topTwo required; segment = explorer, pathfinder or launcher",
    "Colleges: state required; pathwayId and discipline optional; limit 1-50",
    "Aid: state, level, annualIncome and category optional; limit 1-50"
  ) 65 145 820 290 21 | Out-Null
  Add-Box $slides[19] "Aid category: general | obc | sc | st | ews | minority | other" 135 430 690 50 0xFFF3E8 $orange 17 | Out-Null
  Add-Footer $slides[19] 20

  # 21
  Add-Header $slides[20] "Internal import: exact parameters"
  Add-Box $slides[20] "POST /api/v1/internal/catalog/imports" 80 135 800 48 $darkGreen $darkGreen 18 | Out-Null
  Add-TextBox $slides[20] "Authorization" 75 215 200 28 16 $muted $true | Out-Null
  Add-TextBox $slides[20] "Bearer <INTERNAL_API_KEY>" 300 215 560 28 17 $dark $true | Out-Null
  Add-TextBox $slides[20] "idempotency-key" 75 265 200 28 16 $muted $true | Out-Null
  Add-TextBox $slides[20] "b6065da3-43d7-414f-a976-e2a81574adaa" 300 265 560 28 17 $dark $true | Out-Null
  Add-TextBox $slides[20] "Request body" 75 315 200 28 16 $muted $true | Out-Null
  Add-Box $slides[20] '{ "datasetKey": "aid-schemes-poc" }' 300 305 560 52 $mint $green 17 | Out-Null
  Add-TextBox $slides[20] "Allowed: careers-poc | streams-poc | colleges-poc | aid-schemes-poc" 135 375 690 30 15 $muted $true 2 | Out-Null
  Add-TextBox $slides[20] "Expected: published or already_published + importId + checksum" 135 420 690 35 17 $dark $true 2 | Out-Null
  Add-Footer $slides[20] 21

  # 22
  Add-Header $slides[21] "Import report: use the returned ID"
  Add-Box $slides[21] "POST import response" 65 165 245 68 $mint $green 18 | Out-Null
  Add-Arrow $slides[21] 315 199 410 199
  Add-Box $slides[21] "Copy importId" 420 165 180 68 0xFFF3E8 $orange 18 | Out-Null
  Add-Arrow $slides[21] 605 199 700 199
  Add-Box $slides[21] "GET /imports/{id}/report" 710 165 200 68 0xEEF5FF $blue 16 | Out-Null
  Add-Bullets $slides[21] @(
    "Use the same Bearer authorization",
    "{id} is importId returned by POST",
    "The idempotency key is not the import ID",
    "Verify status, version, recordCount, checksum and issues"
  ) 165 300 650 170 18 | Out-Null
  Add-Footer $slides[21] 22

  # 23
  $end = $slides[22].Shapes.AddShape(1, 0, 0, 960, 540)
  $end.Fill.ForeColor.RGB = $darkGreen
  $end.Line.Visible = 0
  Add-TextBox $slides[22] "Module 3 is the`ntrusted knowledge layer." 75 125 810 105 40 $white $true 2 | Out-Null
  Add-TextBox $slides[22] "18 tables | 8 endpoints | one traceable flow" 130 280 700 40 22 $mint $false 2 | Out-Null
  Add-Box $slides[22] "Questions?" 355 390 250 62 $mint $mint 22 | Out-Null

  if (Test-Path $outputPath) { Remove-Item -LiteralPath $outputPath }
  $presentation.SaveAs($outputPath, 24)
  Write-Output $outputPath
}
finally {
  $presentation.Close()
  $powerPoint.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($presentation) | Out-Null
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($powerPoint) | Out-Null
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
