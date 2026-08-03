$files = Get-ChildItem -Path tests -Filter *.ts -Recurse -File
$results = @()
foreach ($f in $files) {
    # Skip non-test files like utils or fixtures if they don't have test in name, 
    # but let's just run everything that looks like a test.
    if ($f.Name -match "(test|bench|compat|architecture|contract|unit|scheduler|snapshot)") {
        Write-Host "Running $($f.Name)..."
        $output = npx tsx $f.FullName 2>&1
        $status = $LASTEXITCODE -eq 0
        $results += @{
            Name = $f.Name
            Path = $f.FullName
            Passed = $status
            Output = $output -join "`n"
        }
    }
}
$results | ConvertTo-Json -Depth 3 | Out-File -FilePath test_results.json -Encoding utf8
Write-Host "Tests complete. Results saved to test_results.json"
