# API Test Suite

This directory contains comprehensive API tests for the PharmaEasy pharmacy management system.

## Test Files

- `api-tests.ps1` - PowerShell script for testing all API endpoints

## Prerequisites

1. **Server Running**: Ensure the backend server is running on `http://localhost:5000`
   ```bash
   cd backend
   npm start
   ```

2. **MongoDB Running**: Ensure MongoDB is running and accessible

3. **Environment Variables**: Ensure `.env` file is configured with:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `PORT` (optional, defaults to 5000)

## Running Tests

### PowerShell Tests

Run all tests:
```powershell
cd tests
.\api-tests.ps1
```

Run from project root:
```powershell
.\tests\api-tests.ps1
```

## Test Coverage

The test suite covers the following requirements:

### 1. Authentication Flow (Requirement 6.1)
- ✅ User signup with validation
- ✅ User login with JWT token generation
- ✅ Protected route access without token (401)
- ✅ Protected route access with valid token

### 2. Medicine CRUD Operations (Requirement 6.2)
- ✅ Create new medicine
- ✅ Get all medicines
- ✅ Get medicine by ID
- ✅ Search medicines by name
- ✅ Duplicate medicine rejection (409)
- ✅ Invalid ID format handling (400)
- ✅ Non-existent medicine handling (404)
- ✅ Missing required fields validation (400)
- ✅ Invalid price validation (400)

### 3. Batch Creation and Filtering (Requirement 6.3)
- ✅ Get free locations
- ✅ Create batch with automatic location assignment
- ✅ Get all batches
- ✅ Filter batches by medicine ID
- ✅ Verify location occupation status

### 4. Bill Generation (Requirement 6.5)
- ✅ Generate bill with valid items
- ✅ Verify stock deduction after bill
- ✅ Get billing history
- ✅ Insufficient stock rejection (400)
- ✅ FIFO batch deduction

### 5. Alert Endpoints (Requirement 6.4, 6.6)
- ✅ Get all alerts (low stock, expiring, expired)
- ✅ Manual alert check trigger
- ✅ Create expiring batch for testing
- ✅ Verify expiring alert detection

### 6. Error Handling
- ✅ Invalid ID format (400)
- ✅ Resource not found (404)
- ✅ Duplicate resource (409)
- ✅ Validation errors (400)
- ✅ Unauthorized access (401)

## Test Output

The script provides colored output:
- ✅ Green: Test passed
- ❌ Red: Test failed
- ℹ️ Cyan: Test information
- Yellow: Section headers

Example output:
```
========== 1. AUTHENTICATION TESTS ==========
ℹ️  Test 1.1: POST /api/signup - Create new user
✅ Signup successful
   User: test1234567890@pharmacy.com

ℹ️  Test 1.2: POST /api/login - Authenticate and get token
✅ Login successful
   Token received

========== TEST SUMMARY ==========
Total Tests: 35
Passed: 35
Failed: 0
Pass Rate: 100%

🎉 All tests passed!
```

## Test Data

The script automatically:
- Creates unique test users with timestamps
- Generates random medicine names to avoid conflicts
- Creates test batches with appropriate expiry dates
- Cleans up by using unique identifiers

## Troubleshooting

### Server Not Running
```
Error: Unable to connect to the remote server
```
**Solution**: Start the backend server with `npm start` in the `backend` directory

### MongoDB Not Connected
```
Error: MongoNetworkError
```
**Solution**: Ensure MongoDB is running and `MONGODB_URI` is correct in `.env`

### Authentication Failures
```
Error: 401 Unauthorized
```
**Solution**: Check that JWT_SECRET is set in `.env` and the token is being generated correctly

### Port Already in Use
```
Error: EADDRINUSE
```
**Solution**: Stop other processes using port 5000 or change the PORT in `.env`

## Manual Testing

You can also test individual endpoints using PowerShell:

### Test Login
```powershell
$loginData = @{
    email = "user@example.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "http://localhost:5000/api/login" -Method Post -Body $loginData -ContentType "application/json"
$token = $response.token
```

### Test Protected Endpoint
```powershell
$headers = @{
    "Authorization" = "Bearer $token"
}

$medicines = Invoke-RestMethod -Uri "http://localhost:5000/api/medicines" -Method Get -Headers $headers
```

## CI/CD Integration

To integrate these tests into CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run API Tests
  run: |
    npm start &
    sleep 5
    pwsh ./tests/api-tests.ps1
```

## Contributing

When adding new endpoints:
1. Add corresponding tests to `api-tests.ps1`
2. Update this README with new test coverage
3. Ensure all tests pass before committing
4. Follow the existing test structure and naming conventions
