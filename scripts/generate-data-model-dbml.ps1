param(
  [string]$RepositoryRoot = (Split-Path -Parent $PSScriptRoot)
)

$ErrorActionPreference = 'Stop'

$dataModelDirectory = Join-Path $RepositoryRoot 'docs\data-model'
$overviewPath = Join-Path $dataModelDirectory 'yuvanext-phase-a-mvp.dbml'

$modules = [ordered]@{
  assessment = [ordered]@{
    title = 'Module 1 - Assessment'
    file = 'module-1-assessment-mvp.dbml'
    tables = @(
      'assessment.user_profiles',
      'assessment.journey_sessions',
      'assessment.guardian_consents',
      'assessment.intake_question_sets',
      'assessment.intake_questions',
      'assessment.intake_answers',
      'assessment.assessment_definitions',
      'assessment.assessment_versions',
      'assessment.assessment_items',
      'assessment.assessment_item_options',
      'assessment.assessment_runs',
      'assessment.assessment_responses',
      'assessment.assessment_results',
      'assessment.profile_snapshots',
      'assessment.profile_snapshot_results'
    )
  }
  knowledge = [ordered]@{
    title = 'Module 3 - Knowledge'
    file = 'module-3-knowledge-mvp.dbml'
    tables = @(
      'knowledge.knowledge_sources',
      'knowledge.dataset_versions',
      'knowledge.education_routes',
      'knowledge.careers',
      'knowledge.career_interest_profiles',
      'knowledge.career_value_profiles',
      'knowledge.career_profiles',
      'knowledge.pathways',
      'knowledge.career_pathways',
      'knowledge.stream_options',
      'knowledge.stream_maps',
      'knowledge.stream_map_items',
      'knowledge.colleges',
      'knowledge.disciplines',
      'knowledge.college_programs',
      'knowledge.pathway_disciplines',
      'knowledge.aid_schemes',
      'knowledge.aid_criteria'
    )
  }
  recommendation = [ordered]@{
    title = 'Module 2 - Recommendation'
    file = 'module-2-recommendation-mvp.dbml'
    tables = @(
      'recommendation.matching_configurations',
      'recommendation.feasibility_rules',
      'recommendation.recommendation_runs',
      'recommendation.recommendation_rings',
      'recommendation.recommendation_items',
      'recommendation.plan_templates',
      'recommendation.plan_template_steps',
      'recommendation.generated_plans',
      'recommendation.generated_plan_steps',
      'recommendation.missions'
    )
  }
  counselor = [ordered]@{
    title = 'Module 4 - AI Counselor'
    file = 'module-4-counselor-mvp.dbml'
    tables = @(
      'counselor.conversations',
      'counselor.conversation_messages',
      'counselor.conversation_summaries',
      'counselor.tool_calls',
      'counselor.message_grounding',
      'counselor.journey_states',
      'counselor.journey_events',
      'counselor.exploration_events',
      'counselor.report_snapshots',
      'counselor.generated_assets'
    )
  }
  safety_operations = [ordered]@{
    title = 'Module 5 - Safety and Operations'
    file = 'module-5-safety-operations-mvp.dbml'
    tables = @(
      'safety_private.safety_policy_versions',
      'safety_private.approved_safety_messages',
      'safety_private.safety_rule_sets',
      'safety_private.safety_events',
      'safety_private.handoffs',
      'safety_private.alert_deliveries',
      'operations.staff_profiles',
      'operations.staff_role_assignments',
      'safety_private.handoff_actions',
      'operations.audit_events',
      'operations.privacy_jobs',
      'operations.privacy_job_steps',
      'operations.analytics_events',
      'operations.evaluation_cases',
      'operations.evaluation_runs',
      'operations.evaluation_results'
    )
  }
}

$moduleDocuments = @(
  'module-1-assessment-data-model.md',
  'module-2-recommendation-data-model.md',
  'module-3-knowledge-data-model.md',
  'module-4-counselor-data-model.md',
  'module-5-safety-operations-data-model.md'
)

$definitions = @{}

foreach ($documentName in $moduleDocuments) {
  $documentPath = Join-Path $dataModelDirectory $documentName
  $currentTable = $null

  foreach ($line in Get-Content $documentPath -Encoding UTF8) {
    if ($line -match '^### `([^`]+)`$') {
      $currentTable = $Matches[1]
      if (-not $definitions.ContainsKey($currentTable)) {
        $definitions[$currentTable] = [System.Collections.Generic.List[object]]::new()
      }
      continue
    }

    if ($line -match '^## ') {
      $currentTable = $null
      continue
    }

    if ($currentTable -and $line -match '^\| `([^`]+)` \| `([^`]+)` \| (.*) \|$') {
      $definitions[$currentTable].Add([pscustomobject]@{
        Name = $Matches[1]
        Type = $Matches[2]
        Rules = $Matches[3].Trim()
      })
    }
  }
}

function Add-ManualTableDefinition {
  param(
    [string]$TableName,
    [object[]]$Fields
  )

  $definitions[$TableName] = [System.Collections.Generic.List[object]]::new()
  foreach ($field in $Fields) {
    $definitions[$TableName].Add([pscustomobject]@{
      Name = $field[0]
      Type = $field[1]
      Rules = $field[2]
    })
  }
}

Add-ManualTableDefinition 'knowledge.stream_options' @(
  @('id', 'uuid', 'PK'),
  @('stream_code', 'text', 'Unique stable code; required'),
  @('title', 'text', 'Required'),
  @('description', 'text', 'Approved description; required'),
  @('status', 'text', 'Required')
)

Add-ManualTableDefinition 'knowledge.stream_maps' @(
  @('id', 'uuid', 'PK'),
  @('top_two_code', 'text', 'Approved top-two RIASEC code; required'),
  @('version', 'text', 'Required'),
  @('dataset_version_id', 'uuid', 'FK; required'),
  @('status', 'text', 'Required')
)

Add-ManualTableDefinition 'knowledge.stream_map_items' @(
  @('map_id', 'uuid', 'PK/FK; required'),
  @('stream_option_id', 'uuid', 'PK/FK; required'),
  @('rank', 'smallint', 'Positive and unique within map'),
  @('reason_key', 'text', 'Approved reason key; required')
)

Add-ManualTableDefinition 'knowledge.disciplines' @(
  @('id', 'uuid', 'PK'),
  @('discipline_code', 'text', 'Unique stable code; required'),
  @('title', 'text', 'Required'),
  @('domain_code', 'text', 'Controlled domain code; required'),
  @('status', 'text', 'Required')
)

Add-ManualTableDefinition 'knowledge.pathway_disciplines' @(
  @('pathway_id', 'uuid', 'PK/FK; required'),
  @('discipline_id', 'uuid', 'PK/FK; required'),
  @('relevance_weight', 'numeric(6,5)', 'Check 0..1; required'),
  @('mapping_version', 'text', 'Required')
)

Add-ManualTableDefinition 'operations.privacy_job_steps' @(
  @('id', 'uuid', 'PK'),
  @('privacy_job_id', 'uuid', 'FK; required'),
  @('module_code', 'text', 'Required'),
  @('status', 'text', 'Required'),
  @('attempt_count', 'smallint', 'Non-negative; required'),
  @('started_at', 'timestamptz', 'Nullable'),
  @('completed_at', 'timestamptz', 'Nullable'),
  @('error_code', 'text', 'Nullable safe code')
)

$existingDbml = [System.IO.File]::ReadAllText($overviewPath, [System.Text.Encoding]::UTF8)
$existingAttributes = @{}
$existingIndexes = @{}

$tablePattern = '(?ms)^Table\s+([a-z_]+\.[a-z_]+)\s*\{(.*?)(?=^Table\s+|\z)'
foreach ($tableMatch in [regex]::Matches($existingDbml, $tablePattern)) {
  $tableName = $tableMatch.Groups[1].Value
  $body = $tableMatch.Groups[2].Value

  foreach ($fieldMatch in [regex]::Matches($body, '(?m)^\s{2}([a-z_][a-z0-9_]*)\s+([^\s]+)(.*)$')) {
    $fieldName = $fieldMatch.Groups[1].Value
    if ($fieldName -eq 'indexes') {
      continue
    }

    $suffix = $fieldMatch.Groups[3].Value
    $key = "$tableName.$fieldName"
    $attributes = [ordered]@{}

    if ($suffix -match '(?i)(?:^|[\[, ])pk(?:[,\] ])') { $attributes.pk = $true }
    if ($suffix -match '(?i)not null') { $attributes.not_null = $true }
    if ($suffix -match '(?i)(?:^|[\[, ])unique(?:[,\] ])') { $attributes.unique = $true }
    if ($suffix -match '(?i)ref:\s*>\s*([a-z_]+\.[a-z_]+\.[a-z_]+)') { $attributes.ref = $Matches[1] }
    if ($suffix -match '(?i)default:\s*([^,\]]+)') { $attributes.default = $Matches[1].Trim() }

    $existingAttributes[$key] = $attributes
  }

  $indexMatch = [regex]::Match($body, '(?ms)^\s{2}indexes\s*\{.*?^\s{2}\}')
  if ($indexMatch.Success) {
    $existingIndexes[$tableName] = $indexMatch.Value.TrimEnd()
  }
}

$additionalReferences = @{
  'recommendation.matching_configurations.approved_by' = 'auth.users.id'
  'recommendation.plan_templates.approved_by' = 'auth.users.id'
  'knowledge.dataset_versions.created_by' = 'auth.users.id'
  'knowledge.career_profiles.reviewed_by' = 'auth.users.id'
}

function Escape-DbmlNote {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $null
  }

  return $Value.Replace('\', '\\').Replace("'", "\'").Replace('`', '').Trim()
}

function Get-FieldAttributes {
  param(
    [string]$TableName,
    [object]$Field
  )

  $key = "$TableName.$($Field.Name)"
  $attributes = [System.Collections.Generic.List[string]]::new()
  $existing = $existingAttributes[$key]

  $isPrimaryKey = ($existing -and $existing.pk) -or ($Field.Rules -match '(?i)(?:^|[/ ])PK(?:$|[/,; ])')
  $isNullable = $Field.Rules -match '(?i)nullable'
  $isRequired = $Field.Rules -match '(?i)required'

  if ($isPrimaryKey) { $attributes.Add('pk') }
  if (-not $isPrimaryKey -and -not $isNullable -and (($existing -and $existing.not_null) -or $isRequired)) {
    $attributes.Add('not null')
  }
  if ($existing -and $existing.unique) { $attributes.Add('unique') }

  $reference = $null
  if ($existing -and $existing.ref) {
    $reference = $existing.ref
  } elseif ($additionalReferences.ContainsKey($key)) {
    $reference = $additionalReferences[$key]
  }

  if ($reference) { $attributes.Add("ref: > $reference") }
  if ($existing -and $existing.default) { $attributes.Add("default: $($existing.default)") }

  $note = Escape-DbmlNote $Field.Rules
  if ($note) { $attributes.Add("note: '$note'") }

  return $attributes
}

function New-TableBlock {
  param([string]$TableName)

  if (-not $definitions.ContainsKey($TableName)) {
    throw "No target field definition found for $TableName"
  }

  $lines = [System.Collections.Generic.List[string]]::new()
  $lines.Add("Table $TableName {")

  foreach ($field in $definitions[$TableName]) {
    $attributes = Get-FieldAttributes $TableName $field
    $suffix = if ($attributes.Count -gt 0) { ' [' + ($attributes -join ', ') + ']' } else { '' }
    $lines.Add("  $($field.Name) $($field.Type)$suffix")
  }

  if ($existingIndexes.ContainsKey($TableName)) {
    $lines.Add('')
    foreach ($indexLine in ($existingIndexes[$TableName] -split "`r?`n")) {
      $lines.Add($indexLine)
    }
  }

  $lines.Add('}')
  return ($lines -join "`r`n")
}

$allIncludedTables = [System.Collections.Generic.List[string]]::new()
foreach ($module in $modules.Values) {
  foreach ($tableName in $module.tables) {
    if ($allIncludedTables.Contains($tableName)) {
      throw "Duplicate MVP table in module map: $tableName"
    }
    $allIncludedTables.Add($tableName)
  }
}

if ($allIncludedTables.Count -ne 69) {
  throw "Expected 69 project-owned MVP tables; found $($allIncludedTables.Count)."
}

$tableBlocks = @{}
foreach ($tableName in $allIncludedTables) {
  $tableBlocks[$tableName] = New-TableBlock $tableName
}

$authUsersBlock = @'
Table auth.users {
  id uuid [pk, note: 'Supabase-managed external identity']
}
'@

$overviewLines = [System.Collections.Generic.List[string]]::new()
$overviewLines.Add('// YuvaNext Phase A MVP - complete field-level ERD')
$overviewLines.Add('// 69 target-compatible project tables plus external Supabase auth.users.')
$overviewLines.Add('// Generated by scripts/generate-data-model-dbml.ps1 from the target module Markdown and validated relationship metadata.')
$overviewLines.Add('')
$overviewLines.Add($authUsersBlock.TrimEnd())

foreach ($module in $modules.Values) {
  $overviewLines.Add('')
  $overviewLines.Add("// $($module.title.ToUpperInvariant()) ($($module.tables.Count) TABLES)")
  foreach ($tableName in $module.tables) {
    $overviewLines.Add('')
    $overviewLines.Add($tableBlocks[$tableName])
  }
}

$utf8WithoutBom = [System.Text.UTF8Encoding]::new($false)
[System.IO.File]::WriteAllText($overviewPath, ($overviewLines -join "`r`n") + "`r`n", $utf8WithoutBom)

function Get-ReferenceTarget {
  param(
    [string]$TableName,
    [object]$Field
  )

  $key = "$TableName.$($Field.Name)"
  $existing = $existingAttributes[$key]
  if ($existing -and $existing.ref) { return $existing.ref }
  if ($additionalReferences.ContainsKey($key)) { return $additionalReferences[$key] }
  return $null
}

foreach ($module in $modules.Values) {
  $ownedTables = @($module.tables)
  $externalFields = @{}

  foreach ($tableName in $ownedTables) {
    foreach ($field in $definitions[$tableName]) {
      $reference = Get-ReferenceTarget $tableName $field
      if (-not $reference) { continue }

      $referenceParts = $reference.Split('.')
      $targetTable = "$($referenceParts[0]).$($referenceParts[1])"
      $targetField = $referenceParts[2]

      if ($targetTable -notin $ownedTables) {
        if (-not $externalFields.ContainsKey($targetTable)) {
          $externalFields[$targetTable] = [System.Collections.Generic.HashSet[string]]::new()
        }
        [void]$externalFields[$targetTable].Add($targetField)
      }
    }
  }

  $moduleLines = [System.Collections.Generic.List[string]]::new()
  $moduleLines.Add("// YuvaNext Phase A MVP - $($module.title)")
  $moduleLines.Add("// $($ownedTables.Count) owned tables with complete target fields. External tables are key-only relationship stubs.")
  $moduleLines.Add('// Generated by scripts/generate-data-model-dbml.ps1.')

  if ($externalFields.Count -gt 0) {
    $moduleLines.Add('')
    $moduleLines.Add('// EXTERNAL RELATIONSHIP STUBS - NOT OWNED BY THIS MODULE')

    foreach ($targetTable in ($externalFields.Keys | Sort-Object)) {
      $moduleLines.Add('')
      $moduleLines.Add("Table $targetTable {")
      foreach ($targetField in ($externalFields[$targetTable] | Sort-Object)) {
        $targetType = 'uuid'
        if ($targetTable -ne 'auth.users' -and $definitions.ContainsKey($targetTable)) {
          $targetDefinition = $definitions[$targetTable] | Where-Object Name -eq $targetField | Select-Object -First 1
          if ($targetDefinition) { $targetType = $targetDefinition.Type }
        }
        $moduleLines.Add("  $targetField $targetType [pk, note: 'External relationship key; full table belongs to another module']")
      }
      $moduleLines.Add('}')
    }
  }

  $moduleLines.Add('')
  $moduleLines.Add('// MODULE-OWNED TABLES')
  foreach ($tableName in $ownedTables) {
    $moduleLines.Add('')
    $moduleLines.Add($tableBlocks[$tableName])
  }

  $modulePath = Join-Path $dataModelDirectory $module.file
  [System.IO.File]::WriteAllText($modulePath, ($moduleLines -join "`r`n") + "`r`n", $utf8WithoutBom)
}

function Get-DbmlTableMap {
  param([string]$Path)

  $source = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
  $tableMap = @{}

  foreach ($tableMatch in [regex]::Matches($source, $tablePattern)) {
    $tableName = $tableMatch.Groups[1].Value
    if ($tableMap.ContainsKey($tableName)) {
      throw "Duplicate table $tableName in $Path"
    }

    $fieldNames = [System.Collections.Generic.List[string]]::new()
    foreach ($fieldMatch in [regex]::Matches($tableMatch.Groups[2].Value, '(?m)^\s{2}([a-z_][a-z0-9_]*)\s+([^\s]+)(.*)$')) {
      if ($fieldMatch.Groups[1].Value -ne 'indexes') {
        $fieldNames.Add($fieldMatch.Groups[1].Value)
      }
    }
    $tableMap[$tableName] = $fieldNames
  }

  $referenceTargets = [regex]::Matches($source, 'ref:\s*>\s*([a-z_]+\.[a-z_]+)\.[a-z_]+') |
    ForEach-Object { $_.Groups[1].Value }

  foreach ($referenceTarget in $referenceTargets) {
    if (-not $tableMap.ContainsKey($referenceTarget)) {
      throw "Reference target $referenceTarget is missing from $Path"
    }
  }

  return $tableMap
}

$overviewTableMap = Get-DbmlTableMap $overviewPath
if ($overviewTableMap.Count -ne 70) {
  throw "Expected 70 overview tables including auth.users; found $($overviewTableMap.Count)."
}

foreach ($tableName in $allIncludedTables) {
  if (-not $overviewTableMap.ContainsKey($tableName)) {
    throw "Overview is missing included table $tableName"
  }

  $expectedFields = @($definitions[$tableName] | ForEach-Object Name)
  $actualFields = @($overviewTableMap[$tableName])
  $missingFields = @($expectedFields | Where-Object { $_ -notin $actualFields })
  $unexpectedFields = @($actualFields | Where-Object { $_ -notin $expectedFields })

  if ($missingFields.Count -gt 0 -or $unexpectedFields.Count -gt 0) {
    throw "Overview field mismatch for $tableName. Missing: $($missingFields -join ', '); unexpected: $($unexpectedFields -join ', ')"
  }
}

foreach ($module in $modules.Values) {
  $modulePath = Join-Path $dataModelDirectory $module.file
  $moduleTableMap = Get-DbmlTableMap $modulePath

  foreach ($tableName in $module.tables) {
    if (-not $moduleTableMap.ContainsKey($tableName)) {
      throw "$($module.file) is missing owned table $tableName"
    }

    $expectedFields = @($definitions[$tableName] | ForEach-Object Name)
    $actualFields = @($moduleTableMap[$tableName])
    $missingFields = @($expectedFields | Where-Object { $_ -notin $actualFields })
    $unexpectedFields = @($actualFields | Where-Object { $_ -notin $expectedFields })

    if ($missingFields.Count -gt 0 -or $unexpectedFields.Count -gt 0) {
      throw "$($module.file) field mismatch for $tableName. Missing: $($missingFields -join ', '); unexpected: $($unexpectedFields -join ', ')"
    }
  }
}

Write-Output "Generated overall DBML: $overviewPath"
foreach ($module in $modules.Values) {
  Write-Output "Generated module DBML: $(Join-Path $dataModelDirectory $module.file)"
}
Write-Output 'Validation passed: 69 owned tables, complete target fields, and resolvable DBML references.'
