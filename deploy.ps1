param(
    [string]$SubscriptionId = "e67a8103-5f9e-4340-ba48-1e7ac9a6088a",
    [string]$ResourceGroupName = "rg-app-7p-pro-01",
    [string]$WebAppName = "app-front-7p-pro-01",
    [string]$NodeVersion = "~22",
    [string]$TempRootBase = "C:\t",
    [string]$PackagePath,
    [switch]$SkipBuild,
    [switch]$UseExistingZip,
    [switch]$KeepPackage
)
 
$ErrorActionPreference = "Stop"
 
function Require-Command {
    param([string]$Name)
 
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}
 
function Invoke-Npm {
    param(
        [string]$WorkingDirectory,
        [string[]]$Arguments
    )
 
    Push-Location $WorkingDirectory
    try {
        $npmCommand = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
        if (-not $npmCommand) {
            $npmCommand = Get-Command 'npm' -ErrorAction Stop
        }
 
        & $npmCommand.Source @Arguments
        if ($LASTEXITCODE -ne 0) {
            throw "npm $($Arguments -join ' ') failed in $WorkingDirectory"
        }
    }
    finally {
        Pop-Location
    }
}
 
function Install-NpmDependencies {
    param(
        [string]$WorkingDirectory,
        [switch]$ProductionOnly
    )
 
    $lockPath = Join-Path $WorkingDirectory 'package-lock.json'
    $omitArgs = if ($ProductionOnly) { @('--omit=dev') } else { @() }
 
    if (Test-Path $lockPath) {
        try {
            Write-Host "Running npm ci in $WorkingDirectory..." -ForegroundColor Cyan
            $npmCiArgs = @('ci') + $omitArgs
            Invoke-Npm -WorkingDirectory $WorkingDirectory -Arguments $npmCiArgs
            return
        }
        catch {
            Write-Warning "npm ci failed in $WorkingDirectory. Falling back to npm install."
        }
    }
 
    Write-Host "Running npm install in $WorkingDirectory..." -ForegroundColor Yellow
    $npmInstallArgs = @('install') + $omitArgs
    Invoke-Npm -WorkingDirectory $WorkingDirectory -Arguments $npmInstallArgs
}
 
function Invoke-Robocopy {
    param(
        [string]$Source,
        [string]$Destination,
        [string[]]$ExcludeDirectories = @(),
        [string[]]$ExcludeFiles = @()
    )
 
    New-Item -ItemType Directory -Path $Destination -Force | Out-Null
 
    $commandArgs = @(
        $Source,
        $Destination,
        '/E',
        '/NFL',
        '/NDL',
        '/NJH',
        '/NJS',
        '/NP',
        '/R:2',
        '/W:2'
    )
 
    if ($ExcludeDirectories.Count -gt 0) {
        $commandArgs += '/XD'
        $commandArgs += $ExcludeDirectories | ForEach-Object { Join-Path $Source $_ }
    }
 
    if ($ExcludeFiles.Count -gt 0) {
        $commandArgs += '/XF'
        $commandArgs += $ExcludeFiles
    }
 
    & robocopy @commandArgs | Out-Null
    if ($LASTEXITCODE -gt 7) {
        throw "robocopy failed with exit code $LASTEXITCODE"
    }
}
 
function Invoke-AzureCli {
    param([string[]]$Arguments)
 
    & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "az $($Arguments -join ' ') failed"
    }
}
 
function Get-AzureCliOutput {
    param([string[]]$Arguments)
 
    $output = & az @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "az $($Arguments -join ' ') failed"
    }
 
    return $output
}
 
function Get-AzureCliJson {
    param([string[]]$Arguments)
 
    $jsonOutput = Get-AzureCliOutput -Arguments ($Arguments + @('--output', 'json'))
    return $jsonOutput | ConvertFrom-Json
}
 
function Test-DeploymentZip {
    param([string]$ZipPath)
 
    Add-Type -AssemblyName System.IO.Compression.FileSystem
 
    $zip = [System.IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        $entries = $zip.Entries | ForEach-Object { $_.FullName.Replace('\\', '/') }
        $hasPackageJson = $entries -contains 'package.json'
        $hasServerJs = $entries -contains 'server.js'
        $hasDistIndex = $entries -contains 'dist/index.html'
        $hasRootIndex = $entries -contains 'index.html'
        $hasSourceFolder = ($entries | Where-Object { $_ -like 'src/*' } | Select-Object -First 1)
 
        if (-not $hasPackageJson -or -not $hasServerJs -or -not $hasDistIndex) {
            throw "Deployment ZIP is invalid. It must contain package.json, server.js, and dist/index.html at the package root."
        }
 
        if ($hasRootIndex -or $hasSourceFolder) {
            throw "Deployment ZIP contains Vite source files at the root (index.html or src/*). This causes App Service to serve the source app instead of the compiled dist build. Create the ZIP from the staged deployment package, not from the repository root."
        }
    }
    finally {
        $zip.Dispose()
    }
}
 
function New-DeploymentZip {
    param(
        [string]$SourceDirectory,
        [string]$ZipPath
    )
 
    Add-Type -AssemblyName System.IO.Compression.FileSystem
 
    if (Test-Path $ZipPath) {
        Remove-Item -Force $ZipPath
    }
 
    [System.IO.Compression.ZipFile]::CreateFromDirectory(
        $SourceDirectory,
        $ZipPath,
        [System.IO.Compression.CompressionLevel]::Fastest,
        $false
    )
}

function Get-AppRootFromDirectory {
    param([string]$SearchRoot)

    $candidates = @($SearchRoot)
    $candidates += Get-ChildItem -Path $SearchRoot -Directory -Recurse -ErrorAction SilentlyContinue |
        Select-Object -ExpandProperty FullName

    foreach ($candidate in $candidates) {
        $packageJson = Join-Path $candidate 'package.json'
        $serverJs = Join-Path $candidate 'server.js'
        $distIndex = Join-Path $candidate 'dist\index.html'
        $webConfig = Join-Path $candidate 'web.config'

        if ((Test-Path $packageJson) -and (Test-Path $serverJs) -and (Test-Path $distIndex) -and (Test-Path $webConfig)) {
            return $candidate
        }
    }

    return $null
}

function New-StagedDeploymentPackage {
    param(
        [string]$AppRoot,
        [string]$StagePath,
        [string]$ZipPath
    )

    Write-Host "Preparing frontend deployment package..." -ForegroundColor Cyan
    if (Test-Path $StagePath) {
        Remove-Item -Recurse -Force $StagePath
    }

    New-Item -ItemType Directory -Path $StagePath -Force | Out-Null
    Copy-Item -Recurse -Force (Join-Path $AppRoot 'dist') $StagePath
    Copy-Item -Force (Join-Path $AppRoot 'server.js') $StagePath
    Copy-Item -Force (Join-Path $AppRoot 'package.json') $StagePath
    Copy-Item -Force (Join-Path $AppRoot 'web.config') $StagePath

    if (Test-Path (Join-Path $AppRoot 'package-lock.json')) {
        Copy-Item -Force (Join-Path $AppRoot 'package-lock.json') $StagePath
    }

    if (Test-Path (Join-Path $StagePath 'node_modules')) {
        Remove-Item -Recurse -Force (Join-Path $StagePath 'node_modules')
    }

    Install-NpmDependencies -WorkingDirectory $StagePath -ProductionOnly

    Write-Host "Compressing frontend package..." -ForegroundColor Cyan
    New-DeploymentZip -SourceDirectory $StagePath -ZipPath $ZipPath
    Test-DeploymentZip -ZipPath $ZipPath
}
 
Require-Command 'az'
Require-Command 'npm'
Require-Command 'robocopy'
 
$SourcePath = Split-Path -Parent $MyInvocation.MyCommand.Path
$PackageJsonPath = Join-Path $SourcePath 'package.json'
$SourceWebConfigPath = Join-Path $SourcePath 'web.config'
$MockZipPath = Join-Path $SourcePath 'mock.zip'
$FrontendZipPath = Join-Path $SourcePath 'frontend.zip'
$PreferredZipPath = if ($PackagePath) {
    $PackagePath
}
elseif (Test-Path $MockZipPath) {
    $MockZipPath
}
else {
    $FrontendZipPath
}
$ShouldUseExistingZip = $UseExistingZip -or ((-not $PackagePath) -and (Test-Path $MockZipPath))
 
if (-not (Test-Path $PackageJsonPath)) {
    throw "No package.json found in $SourcePath"
}
 
if (-not (Test-Path $SourceWebConfigPath)) {
    throw "No web.config found in $SourcePath"
}
 
if (-not (Test-Path $TempRootBase)) {
    New-Item -ItemType Directory -Path $TempRootBase -Force | Out-Null
}
 
$TempRoot = Join-Path $TempRootBase ("7pfr-" + [Guid]::NewGuid().ToString('N').Substring(0, 8))
$BuildPath = Join-Path $TempRoot 'b'
$StagePath = Join-Path $TempRoot 'p'
$ExtractedZipPath = Join-Path $TempRoot 'x'
$ZipPath = Join-Path $TempRoot 'frontend.zip'
$DeploymentZipPath = $null
 
try {
    Write-Host "Checking Azure login..." -ForegroundColor Cyan
    az account show 1>$null 2>$null
    if ($LASTEXITCODE -ne 0) {
        az login | Out-Null
    }
 
    if ($SubscriptionId.Trim()) {
        Write-Host "Using subscription: $SubscriptionId" -ForegroundColor Cyan
        Invoke-AzureCli -Arguments @('account', 'set', '--subscription', $SubscriptionId)
    }
 
    Write-Host "Validating App Service target..." -ForegroundColor Cyan
    $webApp = Get-AzureCliJson -Arguments @(
        'webapp', 'show',
        '--resource-group', $ResourceGroupName,
        '--name', $WebAppName
    )
 
    if ($webApp.reserved -eq $true) {
        throw "App Service '$WebAppName' is running on Linux. This deployment package uses web.config + iisnode and only supports Windows App Service."
    }
 
    if ($ShouldUseExistingZip) {
        if (-not (Test-Path $PreferredZipPath)) {
            throw "Requested deployment ZIP not found: $PreferredZipPath"
        }
 
        Write-Host "Using existing deployment ZIP: $PreferredZipPath" -ForegroundColor Yellow
        try {
            Test-DeploymentZip -ZipPath $PreferredZipPath
            $DeploymentZipPath = $PreferredZipPath
        }
        catch {
            Write-Host "Existing ZIP is not deployment-ready. Normalizing it..." -ForegroundColor Yellow

            if (Test-Path $ExtractedZipPath) {
                Remove-Item -Recurse -Force $ExtractedZipPath
            }

            Expand-Archive -Path $PreferredZipPath -DestinationPath $ExtractedZipPath -Force
            $zipAppRoot = Get-AppRootFromDirectory -SearchRoot $ExtractedZipPath

            if (-not $zipAppRoot) {
                throw "Could not locate a frontend app inside $PreferredZipPath. Expected package.json, server.js, web.config, and dist/index.html."
            }

            New-StagedDeploymentPackage -AppRoot $zipAppRoot -StagePath $StagePath -ZipPath $ZipPath
            $DeploymentZipPath = $ZipPath
        }
    }
    else {
        Write-Host "Preparing clean frontend workspace..." -ForegroundColor Cyan
        Invoke-Robocopy -Source $SourcePath -Destination $BuildPath `
            -ExcludeDirectories @('node_modules', 'dist', 'coverage', '.git', '.github', '.vscode') `
            -ExcludeFiles @('*.zip')
 
        if (-not $SkipBuild) {
            Install-NpmDependencies -WorkingDirectory $BuildPath
 
            Write-Host "Building frontend..." -ForegroundColor Cyan
            Invoke-Npm -WorkingDirectory $BuildPath -Arguments @('run', 'build')
        }
 
        if (-not (Test-Path (Join-Path $BuildPath 'dist'))) {
            throw 'dist folder not found after build. Frontend package cannot be created.'
        }

        New-StagedDeploymentPackage -AppRoot $BuildPath -StagePath $StagePath -ZipPath $ZipPath
        $DeploymentZipPath = $ZipPath
    }
 
    Write-Host "Applying App Service settings..." -ForegroundColor Cyan
    Invoke-AzureCli -Arguments @(
        'webapp', 'config', 'appsettings', 'set',
        '--resource-group', $ResourceGroupName,
        '--name', $WebAppName,
        '--settings',
        "WEBSITE_NODE_DEFAULT_VERSION=$NodeVersion",
        'SCM_DO_BUILD_DURING_DEPLOYMENT=false',
        'WEBSITE_RUN_FROM_PACKAGE=1'
    )
 
    Write-Host "Deploying frontend package..." -ForegroundColor Cyan
    Invoke-AzureCli -Arguments @(
        'webapp', 'deploy',
        '--resource-group', $ResourceGroupName,
        '--name', $WebAppName,
        '--src-path', $DeploymentZipPath,
        '--type', 'zip',
        '--restart', 'true'
    )
 
    Write-Host "Frontend deployed successfully: https://$WebAppName.azurewebsites.net" -ForegroundColor Green
}
finally {
    if (-not $KeepPackage -and (Test-Path $TempRoot)) {
        Remove-Item -Recurse -Force $TempRoot -ErrorAction SilentlyContinue
    }
    elseif ($KeepPackage -and (Test-Path $TempRoot)) {
        Write-Host "Package preserved at $TempRoot" -ForegroundColor Yellow
    }
}