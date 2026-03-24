# PharmaEasy API Test Suite
# PowerShell script to test all API endpoints
# Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

# Configuration
$BaseUrl = "http://localhost:5000/api"
$ContentType = "application/json"

# Color output helpers
function Write-Success { param($msg) Write-Host "✅ $msg" -ForegroundColor Green }
function Write-Error { param($msg) Write-Host "❌ $msg" -ForegroundColor Red }
function Write-Info { param($msg) Write-Host "ℹ️  $msg" -ForegroundColor Cyan }
function Write-Section { param($msg) Write-Host "`n========== $msg ==========" -ForegroundColor Yellow }

# Test counter
$script:PassedTests = 0
$script:FailedTests = 0
$script:TotalTests = 0

# Test result tracker
function Test-Result {
    param($TestName, $Condition, $Details = "")
    $script:TotalTests++
    if ($Condition) {
        $script:PassedTests++
        Write-Success "$TestName"
        if ($Details) { Write-Host "   $Details" -ForegroundColor Gray }
    } else {
        $script:FailedTests++
        Write-Error "$TestName"
        if ($Details) { Write-Host "   $Details" -ForegroundColor Gray }
    }
}

# Global variables for test data
$script:Token = $null
$script:UserId = $null
$script:MedicineId = $null
$script:BatchId = $null
$script:BillId = $null

Write-Host "`n🧪 PharmaEasy API Test Suite" -ForegroundColor Magenta
Write-Host "Testing API at: $BaseUrl`n" -ForegroundColor Magenta

# ============================================
# 1. AUTHENTICATION TESTS
# ============================================
Write-Section "1. AUTHENTICATION TESTS"

# Test 1.1: Signup - Create new user
Write-Info "Test 1.1: POST /api/signup - Create new user"
try {
    $timestamp = [DateTimeOffset]::UtcNow.ToUnixTimeSeconds()
    $signupData = @{
        email = "test$timestamp@pharmacy.com"
        password = "Test123456"
        name = "Test User"
        role = "staff"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/signup" -Method Post -Body $signupData -ContentType $ContentType
    Test-Result "Signup successful" ($response.success -eq $true) "User: $($response.data.email)"
    $script:UserId = $response.data.userId
} catch {
    Test-Result "Signup failed" $false $_.Exception.Message
}

# Test 1.2: Login - Get JWT token
Write-Info "Test 1.2: POST /api/login - Authenticate and get token"
try {
    $loginData = @{
        email = "test$timestamp@pharmacy.com"
        password = "Test123456"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/login" -Method Post -Body $loginData -ContentType $ContentType
    Test-Result "Login successful" ($response.success -eq $true -and $response.token) "Token received"
    $script:Token = $response.token
} catch {
    Test-Result "Login failed" $false $_.Exception.Message
}

# Test 1.3: Protected route without token (should fail)
Write-Info "Test 1.3: GET /api/medicines - Access without token (should fail with 401)"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Method Get -ContentType $ContentType
    Test-Result "Protected route without token" $false "Should have returned 401"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-Result "Protected route without token returns 401" ($statusCode -eq 401) "Status: $statusCode"
}

# Test 1.4: Protected route with token (should succeed)
Write-Info "Test 1.4: GET /api/medicines - Access with valid token"
try {
    $headers = @{
        "Authorization" = "Bearer $script:Token"
    }
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Protected route with token" ($response -is [Array]) "Medicines retrieved: $($response.Count)"
} catch {
    Test-Result "Protected route with token failed" $false $_.Exception.Message
}

# ============================================
# 2. MEDICINE CRUD TESTS
# ============================================
Write-Section "2. MEDICINE CRUD OPERATIONS"

$headers = @{
    "Authorization" = "Bearer $script:Token"
}

# Test 2.1: Create medicine
Write-Info "Test 2.1: POST /api/medicines - Add new medicine"
try {
    $medicineData = @{
        name = "Test Medicine $(Get-Random -Maximum 10000)"
        price = 150.50
        minimumStock = 20
        category = "Antibiotic"
        manufacturer = "Test Pharma Ltd"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Method Post -Body $medicineData -Headers $headers -ContentType $ContentType
    Test-Result "Medicine created" ($response.success -eq $true) "Medicine: $($response.medicine.name)"
    $script:MedicineId = $response.medicine._id
    $script:MedicineName = $response.medicine.name
} catch {
    Test-Result "Medicine creation failed" $false $_.Exception.Message
}

# Test 2.2: Get all medicines
Write-Info "Test 2.2: GET /api/medicines - Retrieve all medicines"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Get all medicines" ($response -is [Array] -and $response.Count -gt 0) "Total medicines: $($response.Count)"
} catch {
    Test-Result "Get all medicines failed" $false $_.Exception.Message
}

# Test 2.3: Get medicine by ID
Write-Info "Test 2.3: GET /api/medicines/:id - Get specific medicine"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines/$script:MedicineId" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Get medicine by ID" ($response._id -eq $script:MedicineId) "Medicine: $($response.name)"
} catch {
    Test-Result "Get medicine by ID failed" $false $_.Exception.Message
}

# Test 2.4: Search medicines
Write-Info "Test 2.4: GET /api/medicines/search?q=Test - Search medicines"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines/search?q=Test" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Search medicines" ($response -is [Array]) "Results: $($response.Count)"
} catch {
    Test-Result "Search medicines failed" $false $_.Exception.Message
}

# Test 2.5: Duplicate medicine (should fail)
Write-Info "Test 2.5: POST /api/medicines - Duplicate medicine (should fail with 409)"
try {
    $duplicateData = @{
        name = $script:MedicineName
        price = 100
        minimumStock = 10
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Method Post -Body $duplicateData -Headers $headers -ContentType $ContentType
    Test-Result "Duplicate medicine rejected" $false "Should have returned 409"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-Result "Duplicate medicine returns 409" ($statusCode -eq 409) "Status: $statusCode"
}

# ============================================
# 3. BATCH OPERATIONS TESTS
# ============================================
Write-Section "3. BATCH OPERATIONS"

# Test 3.1: Get free locations
Write-Info "Test 3.1: GET /api/locations/free - Get available locations"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/locations/free" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Get free locations" ($response.success -eq $true -and $response.locations.Count -gt 0) "Free locations: $($response.locations.Count)"
    $script:FreeLocation = $response.locations[0].code
} catch {
    Test-Result "Get free locations failed" $false $_.Exception.Message
}

# Test 3.2: Create batch with location assignment
Write-Info "Test 3.2: POST /api/batches - Create batch with auto location"
try {
    $expiryDate = (Get-Date).AddMonths(6).ToString("yyyy-MM-dd")
    $batchData = @{
        medicine = $script:MedicineId
        batchNumber = "BATCH-$(Get-Random -Maximum 10000)"
        quantity = 100
        expiryDate = $expiryDate
        manufacturer = "Test Pharma"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/batches" -Method Post -Body $batchData -Headers $headers -ContentType $ContentType
    Test-Result "Batch created with location" ($response.success -eq $true -and $response.batch.location) "Location: $($response.batch.location)"
    $script:BatchId = $response.batch._id
    $script:BatchLocation = $response.batch.location
} catch {
    Test-Result "Batch creation failed" $false $_.Exception.Message
}

# Test 3.3: Get all batches
Write-Info "Test 3.3: GET /api/batches - Get all batches"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/batches" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Get all batches" ($response.success -eq $true -and $response.batches.Count -gt 0) "Total batches: $($response.batches.Count)"
} catch {
    Test-Result "Get all batches failed" $false $_.Exception.Message
}

# Test 3.4: Filter batches by medicine
Write-Info "Test 3.4: GET /api/batches?medicine=:id - Filter batches by medicine"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/batches?medicine=$script:MedicineId" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Filter batches by medicine" ($response.success -eq $true -and $response.batches.Count -gt 0) "Filtered batches: $($response.batches.Count)"
} catch {
    Test-Result "Filter batches failed" $false $_.Exception.Message
}

# Test 3.5: Verify location is occupied
Write-Info "Test 3.5: GET /api/locations - Verify location occupied"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/locations" -Method Get -Headers $headers -ContentType $ContentType
    $occupiedLocation = $response | Where-Object { $_.code -eq $script:BatchLocation }
    Test-Result "Location marked as occupied" ($occupiedLocation.isOccupied -eq $true) "Location: $($occupiedLocation.code)"
} catch {
    Test-Result "Verify location failed" $false $_.Exception.Message
}

# ============================================
# 4. BILL GENERATION TESTS
# ============================================
Write-Section "4. BILL GENERATION"

# Test 4.1: Generate bill with valid items
Write-Info "Test 4.1: POST /api/generate-bill - Generate bill"
try {
    $billData = @{
        items = @(
            @{
                medicineName = $script:MedicineName
                quantityRequired = 10
            }
        )
        customerName = "Test Customer"
        paymentMethod = "Cash"
    } | ConvertTo-Json -Depth 3

    $response = Invoke-RestMethod -Uri "$BaseUrl/generate-bill" -Method Post -Body $billData -Headers $headers -ContentType $ContentType
    Test-Result "Bill generated" ($response.success -eq $true -and $response.billNumber) "Bill: $($response.billNumber), Amount: $($response.totalAmount)"
    $script:BillId = $response.billId
} catch {
    Test-Result "Bill generation failed" $false $_.Exception.Message
}

# Test 4.2: Verify stock deduction
Write-Info "Test 4.2: GET /api/medicines/:id - Verify stock deducted"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines/$script:MedicineId" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Stock deducted correctly" ($response.totalStock -eq 90) "Current stock: $($response.totalStock)"
} catch {
    Test-Result "Stock verification failed" $false $_.Exception.Message
}

# Test 4.3: Get all bills
Write-Info "Test 4.3: GET /api/bills - Retrieve billing history"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/bills" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Get bills" ($response -is [Array] -and $response.Count -gt 0) "Total bills: $($response.Count)"
} catch {
    Test-Result "Get bills failed" $false $_.Exception.Message
}

# Test 4.4: Generate bill with insufficient stock (should fail)
Write-Info "Test 4.4: POST /api/generate-bill - Insufficient stock (should fail)"
try {
    $billData = @{
        items = @(
            @{
                medicineName = $script:MedicineName
                quantityRequired = 1000
            }
        )
        customerName = "Test Customer"
    } | ConvertTo-Json -Depth 3

    $response = Invoke-RestMethod -Uri "$BaseUrl/generate-bill" -Method Post -Body $billData -Headers $headers -ContentType $ContentType
    Test-Result "Insufficient stock rejected" $false "Should have returned 400"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-Result "Insufficient stock returns 400" ($statusCode -eq 400) "Status: $statusCode"
}

# ============================================
# 5. ALERT TESTS
# ============================================
Write-Section "5. ALERT ENDPOINTS"

# Test 5.1: Get all alerts
Write-Info "Test 5.1: GET /api/alerts - Get all alerts"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/alerts" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Get alerts" ($response.success -eq $true) "Low stock: $($response.counts.lowStock), Expiring: $($response.counts.expiringSoon), Expired: $($response.counts.expired)"
} catch {
    Test-Result "Get alerts failed" $false $_.Exception.Message
}

# Test 5.2: Manual alert check
Write-Info "Test 5.2: POST /api/check-alerts - Trigger alert check"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/check-alerts" -Method Post -Headers $headers -ContentType $ContentType
    Test-Result "Manual alert check" ($response.success -eq $true) $response.summary
} catch {
    Test-Result "Manual alert check failed" $false $_.Exception.Message
}

# Test 5.3: Create expiring batch for alert testing
Write-Info "Test 5.3: Create expiring batch to test alerts"
try {
    $expiryDate = (Get-Date).AddDays(15).ToString("yyyy-MM-dd")
    $batchData = @{
        medicine = $script:MedicineId
        batchNumber = "EXPIRING-$(Get-Random -Maximum 10000)"
        quantity = 50
        expiryDate = $expiryDate
        manufacturer = "Test Pharma"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/batches" -Method Post -Body $batchData -Headers $headers -ContentType $ContentType
    Test-Result "Expiring batch created" ($response.success -eq $true) "Expires in 15 days"
} catch {
    Test-Result "Expiring batch creation failed" $false $_.Exception.Message
}

# Test 5.4: Verify expiring alert appears
Write-Info "Test 5.4: GET /api/alerts - Verify expiring alert"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/alerts" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Expiring alert detected" ($response.counts.expiringSoon -gt 0) "Expiring items: $($response.counts.expiringSoon)"
} catch {
    Test-Result "Expiring alert check failed" $false $_.Exception.Message
}

# ============================================
# 6. ERROR HANDLING TESTS
# ============================================
Write-Section "6. ERROR HANDLING"

# Test 6.1: Invalid medicine ID format
Write-Info "Test 6.1: GET /api/medicines/invalid-id - Invalid ID format"
try {
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines/invalid-id" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Invalid ID rejected" $false "Should have returned 400"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-Result "Invalid ID returns 400" ($statusCode -eq 400) "Status: $statusCode"
}

# Test 6.2: Medicine not found
Write-Info "Test 6.2: GET /api/medicines/:id - Non-existent medicine"
try {
    $fakeId = "507f1f77bcf86cd799439011"
    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines/$fakeId" -Method Get -Headers $headers -ContentType $ContentType
    Test-Result "Non-existent medicine rejected" $false "Should have returned 404"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-Result "Non-existent medicine returns 404" ($statusCode -eq 404) "Status: $statusCode"
}

# Test 6.3: Missing required fields
Write-Info "Test 6.3: POST /api/medicines - Missing required fields"
try {
    $invalidData = @{
        name = "Test"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Method Post -Body $invalidData -Headers $headers -ContentType $ContentType
    Test-Result "Missing fields rejected" $false "Should have returned 400"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-Result "Missing fields returns 400" ($statusCode -eq 400) "Status: $statusCode"
}

# Test 6.4: Invalid price (negative)
Write-Info "Test 6.4: POST /api/medicines - Invalid price"
try {
    $invalidData = @{
        name = "Invalid Medicine"
        price = -50
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$BaseUrl/medicines" -Method Post -Body $invalidData -Headers $headers -ContentType $ContentType
    Test-Result "Invalid price rejected" $false "Should have returned 400"
} catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    Test-Result "Invalid price returns 400" ($statusCode -eq 400) "Status: $statusCode"
}

# ============================================
# TEST SUMMARY
# ============================================
Write-Section "TEST SUMMARY"

Write-Host ""
Write-Host "Total Tests: $script:TotalTests" -ForegroundColor White
Write-Host "Passed: $script:PassedTests" -ForegroundColor Green
Write-Host "Failed: $script:FailedTests" -ForegroundColor Red

$passRate = [math]::Round(($script:PassedTests / $script:TotalTests) * 100, 2)
Write-Host "Pass Rate: $passRate%" -ForegroundColor $(if ($passRate -ge 90) { "Green" } elseif ($passRate -ge 70) { "Yellow" } else { "Red" })

if ($script:FailedTests -eq 0) {
    Write-Host "`n🎉 All tests passed!" -ForegroundColor Green
} else {
    Write-Host "`n⚠️  Some tests failed. Please review the output above." -ForegroundColor Yellow
}

Write-Host ""
