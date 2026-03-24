# PharmaEasy Manual Frontend Testing Guide

## Overview
This guide provides a comprehensive checklist for manually testing all frontend functionality of the PharmaEasy pharmacy management system. Follow the test cases in order to verify the complete user flow.

**Requirements Validated:** 6.1, 6.2, 6.3, 6.4, 6.5, 6.6

---

## Pre-Testing Setup

### Environment Setup
- [ ] Backend server is running on `http://localhost:5000`
- [ ] MongoDB is connected and running
- [ ] Frontend is accessible (via Live Server or static file serving)
- [ ] Browser DevTools console is open for debugging
- [ ] Network tab is open to monitor API calls

### Test Data Preparation
- [ ] At least 2-3 medicines exist in the database
- [ ] At least 5-10 batches exist with various expiry dates
- [ ] Some locations are occupied, some are free
- [ ] At least one medicine has low stock (below minimum)
- [ ] At least one batch is expiring within 30 days

---

## Test Suite 1: Authentication Flow

### 1.1 Login Page Access
**Page:** `login.html`

- [ ] Navigate to login page
- [ ] Page loads without errors
- [ ] Login form is visible with email and password fields
- [ ] Signup form is visible (if on same page) or signup link works
- [ ] No console errors appear

**Expected:** Clean page load with functional forms

---

### 1.2 User Signup
**Page:** `login.html`

**Test Case 1: Valid Signup**
- [ ] Enter valid email (e.g., `test@pharmacy.com`)
- [ ] Enter strong password (e.g., `Test123!@#`)
- [ ] Enter name (e.g., `Test User`)
- [ ] Click signup button
- [ ] Success notification appears
- [ ] User is created in database

**Expected:** Success message, user account created

**Test Case 2: Invalid Email Format**
- [ ] Enter invalid email (e.g., `notanemail`)
- [ ] Enter password
- [ ] Click signup button
- [ ] Error notification appears: "Invalid email format" or similar

**Expected:** Client-side or server-side validation error

**Test Case 3: Weak Password**
- [ ] Enter valid email
- [ ] Enter weak password (e.g., `123`)
- [ ] Click signup button
- [ ] Error notification appears about password requirements

**Expected:** Password validation error

**Test Case 4: Duplicate Email**
- [ ] Use email from Test Case 1
- [ ] Enter password
- [ ] Click signup button
- [ ] Error notification: "Email already exists" or similar

**Expected:** Duplicate email error

---

### 1.3 User Login
**Page:** `login.html`

**Test Case 1: Valid Login**
- [ ] Enter valid email from signup
- [ ] Enter correct password
- [ ] Click login button
- [ ] JWT token is stored in localStorage (check DevTools > Application > Local Storage)
- [ ] Redirect to dashboard.html occurs
- [ ] No console errors

**Expected:** Successful login, token stored, redirect to dashboard

**Test Case 2: Invalid Credentials**
- [ ] Enter valid email
- [ ] Enter wrong password
- [ ] Click login button
- [ ] Error notification: "Invalid credentials" or similar
- [ ] No redirect occurs
- [ ] No token in localStorage

**Expected:** Login fails with error message

**Test Case 3: Non-existent User**
- [ ] Enter email that doesn't exist
- [ ] Enter any password
- [ ] Click login button
- [ ] Error notification appears
- [ ] No redirect occurs

**Expected:** Login fails with error message

---

### 1.4 Rate Limiting
**Page:** `login.html`

**Test Case: Exceed Login Attempts**
- [ ] Attempt login with wrong password 6 times rapidly
- [ ] After 5 attempts, receive 429 error
- [ ] Error notification: "Too many attempts, try again later"
- [ ] Wait 15 minutes or test with different IP

**Expected:** Rate limiting kicks in after 5 attempts

---

### 1.5 Authentication Protection
**Test Case 1: Access Protected Page Without Token**
- [ ] Clear localStorage (DevTools > Application > Local Storage > Clear)
- [ ] Navigate directly to `dashboard.html`
- [ ] Automatic redirect to `login.html` occurs
- [ ] No protected content is visible

**Expected:** Redirect to login page

**Test Case 2: Invalid Token**
- [ ] Set invalid token in localStorage: `localStorage.setItem('token', 'invalid')`
- [ ] Navigate to `dashboard.html`
- [ ] API call returns 401
- [ ] Token is cleared from localStorage
- [ ] Redirect to `login.html` occurs

**Expected:** Token cleared, redirect to login

---

## Test Suite 2: Dashboard Page

### 2.1 Dashboard Access
**Page:** `dashboard.html`

**Prerequisites:** User is logged in

- [ ] Navigate to dashboard
- [ ] Page loads without errors
- [ ] Token is present in localStorage
- [ ] No automatic redirect to login
- [ ] Dashboard UI is visible

**Expected:** Dashboard loads successfully for authenticated user

---

### 2.2 Medicine Search Autocomplete
**Page:** `dashboard.html`

**Test Case 1: Search Existing Medicine**
- [ ] Type medicine name in search box (e.g., "Para")
- [ ] Autocomplete dropdown appears within 300ms
- [ ] Results show matching medicines with name, price, stock
- [ ] Results are filtered based on input
- [ ] Network tab shows GET `/api/medicines/search?q=Para`

**Expected:** Autocomplete works with debounced API calls

**Test Case 2: Select Medicine from Dropdown**
- [ ] Click on a medicine from autocomplete results
- [ ] Medicine details section populates with selected medicine
- [ ] Medicine name, price, manufacturer, stock are displayed
- [ ] Batch table loads for selected medicine

**Expected:** Medicine details and batches displayed

**Test Case 3: Search Non-existent Medicine**
- [ ] Type medicine name that doesn't exist (e.g., "XYZ123")
- [ ] Autocomplete shows "No results found" or empty dropdown
- [ ] No errors in console

**Expected:** Graceful handling of no results

**Test Case 4: Empty Search**
- [ ] Clear search box
- [ ] Autocomplete dropdown closes or shows all medicines
- [ ] No errors occur

**Expected:** Handles empty search gracefully

---

### 2.3 Batch Display
**Page:** `dashboard.html`

**Prerequisites:** Medicine is selected

**Test Case 1: View Batches**
- [ ] Batches table displays all batches for selected medicine
- [ ] Columns: Location, Quantity, Expiry Date, Days Left
- [ ] Expiry dates are formatted correctly (DD/MM/YYYY or similar)
- [ ] Days left is calculated correctly
- [ ] Network tab shows GET `/api/batches?medicine={medicineId}`

**Expected:** Batches displayed in table format

**Test Case 2: Expiring Batch Highlighting**
- [ ] Batches expiring within 30 days are highlighted (yellow/orange)
- [ ] Expired batches are highlighted (red)
- [ ] Normal batches have default styling

**Expected:** Visual indicators for expiring/expired batches

**Test Case 3: No Batches**
- [ ] Select medicine with no batches
- [ ] Message displays: "No batches found" or similar
- [ ] No errors in console

**Expected:** Graceful handling of no batches

---

### 2.4 Logout Functionality
**Page:** `dashboard.html`

**Test Case: Logout**
- [ ] Click logout button
- [ ] Token is removed from localStorage
- [ ] Redirect to `login.html` occurs
- [ ] Attempting to go back to dashboard redirects to login

**Expected:** Successful logout and session cleared

---

## Test Suite 3: Add Medicine Page

### 3.1 Add Medicine Form
**Page:** `add-medicine.html`

**Prerequisites:** User is logged in

**Test Case 1: Valid Medicine Creation**
- [ ] Navigate to add-medicine page
- [ ] Fill in medicine name (e.g., "Aspirin")
- [ ] Fill in price (e.g., 50)
- [ ] Fill in manufacturer (e.g., "PharmaCorp")
- [ ] Fill in category (e.g., "Pain Relief")
- [ ] Fill in minimum stock (e.g., 10)
- [ ] Click submit button
- [ ] Success notification appears
- [ ] Network tab shows POST `/api/medicines` with 201 status
- [ ] Form is cleared or redirects

**Expected:** Medicine created successfully

**Test Case 2: Missing Required Fields**
- [ ] Leave medicine name empty
- [ ] Fill other fields
- [ ] Click submit button
- [ ] Client-side validation error appears
- [ ] Form is not submitted

**Expected:** Validation prevents submission

**Test Case 3: Invalid Price**
- [ ] Enter negative price (e.g., -10)
- [ ] Fill other fields
- [ ] Click submit button
- [ ] Validation error: "Price must be positive"

**Expected:** Price validation error

**Test Case 4: Duplicate Medicine Name**
- [ ] Enter name of existing medicine
- [ ] Fill other fields
- [ ] Click submit button
- [ ] Error notification: "Medicine already exists" or similar
- [ ] Network tab shows 409 Conflict

**Expected:** Duplicate medicine error

---

### 3.2 Add Batch Form
**Page:** `add-medicine.html`

**Test Case 1: Valid Batch Creation**
- [ ] Select medicine from dropdown
- [ ] Enter quantity (e.g., 100)
- [ ] Select expiry date (future date)
- [ ] Select location from dropdown (free locations only)
- [ ] Click submit button
- [ ] Success notification: "Batch created at location X"
- [ ] Network tab shows POST `/api/batches` with 201 status
- [ ] Location is marked as occupied

**Expected:** Batch created and assigned to location

**Test Case 2: Free Locations Dropdown**
- [ ] Open location dropdown
- [ ] Only free (unoccupied) locations are shown
- [ ] Occupied locations are not in dropdown
- [ ] Network tab shows GET `/api/locations?isOccupied=false`

**Expected:** Only free locations available

**Test Case 3: Past Expiry Date**
- [ ] Select medicine
- [ ] Enter quantity
- [ ] Select past expiry date
- [ ] Click submit button
- [ ] Validation error: "Expiry date must be in future"

**Expected:** Date validation error

**Test Case 4: Missing Fields**
- [ ] Leave quantity empty
- [ ] Fill other fields
- [ ] Click submit button
- [ ] Validation error appears

**Expected:** Required field validation

---

## Test Suite 4: Generate Bill Page

### 4.1 Medicine Search and Cart
**Page:** `generate-bill.html`

**Prerequisites:** User is logged in

**Test Case 1: Search and Add to Cart**
- [ ] Type medicine name in search box
- [ ] Autocomplete shows results
- [ ] Click on a medicine
- [ ] Medicine is added to cart
- [ ] Cart displays: medicine name, price, quantity (default 1)
- [ ] Subtotal is calculated correctly

**Expected:** Medicine added to cart with correct details

**Test Case 2: Adjust Quantity**
- [ ] Add medicine to cart
- [ ] Increase quantity using + button or input field
- [ ] Subtotal updates automatically
- [ ] Decrease quantity
- [ ] Subtotal updates

**Expected:** Quantity changes update subtotal

**Test Case 3: Remove from Cart**
- [ ] Add medicine to cart
- [ ] Click remove/delete button
- [ ] Medicine is removed from cart
- [ ] Subtotal updates

**Expected:** Item removed, subtotal recalculated

**Test Case 4: Add Multiple Medicines**
- [ ] Add 3-4 different medicines to cart
- [ ] Each medicine appears as separate line item
- [ ] Subtotal is sum of all items
- [ ] No duplicate entries (or quantity increases if same medicine)

**Expected:** Multiple items in cart with correct total

---

### 4.2 Bill Generation
**Page:** `generate-bill.html`

**Test Case 1: Generate Valid Bill**
- [ ] Add 2-3 medicines to cart with quantities
- [ ] Click "Generate Bill" button
- [ ] Network tab shows POST `/api/generate-bill` with cart data
- [ ] Response includes bill number, total, items
- [ ] Redirect to `bill-success.html` with bill details
- [ ] Bill is saved in database

**Expected:** Bill generated successfully

**Test Case 2: Empty Cart**
- [ ] Clear cart (no items)
- [ ] Click "Generate Bill" button
- [ ] Validation error: "Cart is empty"
- [ ] No API call is made

**Expected:** Cannot generate bill with empty cart

**Test Case 3: Insufficient Stock**
- [ ] Add medicine with quantity exceeding available stock
- [ ] Click "Generate Bill" button
- [ ] Error notification: "Insufficient stock for [medicine name]"
- [ ] Bill is not generated

**Expected:** Stock validation error

---

### 4.3 Bill Success Page
**Page:** `bill-success.html`

**Test Case: View Generated Bill**
- [ ] After generating bill, redirect to bill-success page
- [ ] Bill number is displayed
- [ ] Bill date/time is shown
- [ ] All items are listed with quantities and prices
- [ ] Subtotal is correct
- [ ] Total is correct
- [ ] Option to print or download bill (if implemented)
- [ ] Link to return to dashboard or generate another bill

**Expected:** Complete bill details displayed

---

## Test Suite 5: Billing History Page

### 5.1 View Bills
**Page:** `billing-history.html`

**Prerequisites:** User is logged in, at least one bill exists

**Test Case 1: Display All Bills**
- [ ] Navigate to billing-history page
- [ ] Network tab shows GET `/api/bills`
- [ ] All bills are displayed in table/list format
- [ ] Columns: Bill Number, Date, Total, Items Count
- [ ] Bills are sorted by date (newest first)

**Expected:** All bills displayed correctly

**Test Case 2: View Bill Details**
- [ ] Click on a bill to view details
- [ ] Bill details expand or open in modal
- [ ] All items in bill are shown
- [ ] Quantities and prices are correct
- [ ] Total matches

**Expected:** Bill details displayed

**Test Case 3: No Bills**
- [ ] If no bills exist, message displays: "No bills found"
- [ ] No errors in console

**Expected:** Graceful handling of empty state

---

## Test Suite 6: Alerts Page

### 6.1 View Alerts
**Page:** `alerts.html`

**Prerequisites:** User is logged in

**Test Case 1: Low Stock Alerts**
- [ ] Navigate to alerts page
- [ ] Click "Low Stock" tab
- [ ] Network tab shows GET `/api/alerts?type=low-stock`
- [ ] Medicines with stock below minimum are displayed
- [ ] Each alert shows: medicine name, current stock, minimum stock
- [ ] Alerts are sorted by severity (lowest stock first)

**Expected:** Low stock alerts displayed

**Test Case 2: Expiring Soon Alerts**
- [ ] Click "Expiring Soon" tab
- [ ] Network tab shows GET `/api/alerts?type=expiring-soon`
- [ ] Batches expiring within 30 days are displayed
- [ ] Each alert shows: medicine name, batch location, expiry date, days left
- [ ] Alerts are sorted by expiry date (soonest first)

**Expected:** Expiring soon alerts displayed

**Test Case 3: Expired Alerts**
- [ ] Click "Expired" tab
- [ ] Network tab shows GET `/api/alerts?type=expired`
- [ ] Expired batches are displayed
- [ ] Each alert shows: medicine name, batch location, expiry date
- [ ] Alerts are highlighted in red or with warning icon

**Expected:** Expired alerts displayed

**Test Case 4: No Alerts**
- [ ] If no alerts in a category, message displays: "No alerts"
- [ ] No errors in console

**Expected:** Graceful handling of empty state

---

## Test Suite 7: Locations Page

### 7.1 View Locations
**Page:** `locations.html`

**Prerequisites:** User is logged in

**Test Case 1: Display All Locations**
- [ ] Navigate to locations page
- [ ] Network tab shows GET `/api/locations`
- [ ] All 100 locations are displayed in grid format
- [ ] Each location shows: code (e.g., S1-R1), status (occupied/free)
- [ ] Occupied locations are visually distinct (different color)

**Expected:** All locations displayed with status

**Test Case 2: Filter Free Locations**
- [ ] Click "Show Free Only" filter (if exists)
- [ ] Only unoccupied locations are displayed
- [ ] Count of free locations is shown

**Expected:** Filtered view of free locations

**Test Case 3: Filter Occupied Locations**
- [ ] Click "Show Occupied Only" filter (if exists)
- [ ] Only occupied locations are displayed
- [ ] Count of occupied locations is shown

**Expected:** Filtered view of occupied locations

**Test Case 4: View Location Details**
- [ ] Click on an occupied location
- [ ] Details show: batch information, medicine name, quantity, expiry date
- [ ] Network tab shows GET `/api/batches?location={locationId}`

**Expected:** Location details with batch info

---

## Test Suite 8: Error Handling

### 8.1 Network Errors
**Test Case 1: Backend Offline**
- [ ] Stop backend server
- [ ] Try to perform any action (search, add medicine, etc.)
- [ ] Error notification: "Network error" or "Cannot connect to server"
- [ ] No console errors that crash the app

**Expected:** Graceful error handling

**Test Case 2: Slow Network**
- [ ] Throttle network in DevTools (Slow 3G)
- [ ] Perform actions
- [ ] Loading indicators appear
- [ ] Actions complete successfully (just slower)

**Expected:** Loading states and eventual success

---

### 8.2 API Errors
**Test Case 1: 500 Server Error**
- [ ] Trigger a server error (e.g., invalid data)
- [ ] Error notification displays server error message
- [ ] User can retry or navigate away

**Expected:** Server errors handled gracefully

**Test Case 2: 404 Not Found**
- [ ] Request non-existent resource
- [ ] Error notification: "Resource not found"
- [ ] No console errors

**Expected:** 404 errors handled

---

## Test Suite 9: Responsive Design

### 9.1 Desktop View (1920x1080)
- [ ] All pages render correctly
- [ ] No horizontal scrolling
- [ ] All elements are visible and accessible
- [ ] Tables and grids display properly

**Expected:** Optimal desktop experience

---

### 9.2 Tablet View (768x1024)
- [ ] Resize browser to tablet dimensions
- [ ] Navigation adapts (hamburger menu if applicable)
- [ ] Tables are scrollable or responsive
- [ ] Forms are usable
- [ ] No overlapping elements

**Expected:** Functional tablet experience

---

### 9.3 Mobile View (375x667)
- [ ] Resize browser to mobile dimensions
- [ ] All pages are usable
- [ ] Text is readable without zooming
- [ ] Buttons are tappable (not too small)
- [ ] Forms are usable
- [ ] Tables scroll horizontally or stack vertically

**Expected:** Functional mobile experience

---

## Test Suite 10: Form Validation

### 10.1 Client-Side Validation
**Test across all forms:**
- [ ] Required fields show error when empty
- [ ] Email fields validate email format
- [ ] Number fields reject non-numeric input
- [ ] Date fields reject invalid dates
- [ ] Validation messages are clear and helpful

**Expected:** Comprehensive client-side validation

---

### 10.2 Server-Side Validation
**Test across all forms:**
- [ ] Submit invalid data that passes client validation
- [ ] Server returns validation errors
- [ ] Errors are displayed to user
- [ ] Form data is preserved (not cleared)

**Expected:** Server-side validation as backup

---

## Test Suite 11: Complete User Journey

### 11.1 End-to-End Flow
**Complete User Journey:**
1. [ ] Sign up new user account
2. [ ] Log in with new account
3. [ ] Add a new medicine
4. [ ] Create a batch for that medicine
5. [ ] Search for the medicine on dashboard
6. [ ] View batch details
7. [ ] Generate a bill with the medicine
8. [ ] View bill in billing history
9. [ ] Check alerts page for any alerts
10. [ ] View locations page to see occupied location
11. [ ] Log out
12. [ ] Verify cannot access protected pages
13. [ ] Log back in

**Expected:** Complete flow works without errors

---

## Test Suite 12: Browser Compatibility

### 12.1 Chrome
- [ ] Test all functionality in Chrome
- [ ] No console errors
- [ ] All features work

**Expected:** Full compatibility

---

### 12.2 Firefox
- [ ] Test all functionality in Firefox
- [ ] No console errors
- [ ] All features work

**Expected:** Full compatibility

---

### 12.3 Safari (if available)
- [ ] Test all functionality in Safari
- [ ] No console errors
- [ ] All features work

**Expected:** Full compatibility

---

### 12.4 Edge
- [ ] Test all functionality in Edge
- [ ] No console errors
- [ ] All features work

**Expected:** Full compatibility

---

## Test Results Summary

### Pass/Fail Criteria
- **Pass:** All critical test cases pass, minor issues documented
- **Fail:** Any critical functionality broken, authentication issues, data loss

### Issues Found
Document any issues found during testing:

| Test Case | Issue Description | Severity | Status |
|-----------|------------------|----------|--------|
| Example   | Example issue    | High     | Open   |

### Sign-Off
- **Tester Name:** _______________
- **Date:** _______________
- **Overall Result:** [ ] Pass [ ] Fail
- **Notes:** _______________

---

## Appendix: Quick Reference

### API Endpoints
- POST `/api/signup` - Create user
- POST `/api/login` - Login user
- GET `/api/medicines` - List medicines
- GET `/api/medicines/search?q={query}` - Search medicines
- POST `/api/medicines` - Create medicine
- GET `/api/batches` - List batches
- GET `/api/batches?medicine={id}` - Filter batches
- POST `/api/batches` - Create batch
- POST `/api/generate-bill` - Generate bill
- GET `/api/bills` - List bills
- GET `/api/alerts` - Get alerts
- GET `/api/locations` - List locations

### Common Issues and Solutions
1. **401 Errors:** Check token in localStorage, re-login
2. **CORS Errors:** Verify backend CORS configuration
3. **Network Errors:** Ensure backend is running
4. **Validation Errors:** Check required fields and formats
5. **Rate Limiting:** Wait 15 minutes or use different IP

---

**End of Manual Testing Guide**
