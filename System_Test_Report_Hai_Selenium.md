# System Test Report - Admin Functionalities (Selenium)

**Tester:** Hai
**Date:** 2026-05-06
**Project:** Cinema Booking System - Admin Management

## 1. Test Summary
This report summarizes the results of the automated UI tests performed using Selenium for the administrative modules of the Cinema Booking System. The tests focus on the functions assigned to "Hải" (Operations & Statistics).

## 2. Detailed Test Cases

| Group | ID Test Case | Input data | Expected result (UI) | Expected result (Database) | Actual result (UI) | Actual result (Database) | Rollback | Result | Note | Tester |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Employee Management** | TC_USER_01 | Search term: "Hải" | Show staff list containing "Hải" | No changes | Correctly displayed staff list | No changes | N/A | **PASS** | `userService.ts`:28 | Hai |
| **Employee Management** | TC_USER_02 | Email: "existing@gmail.com" | Show error: "Email already exists" | Record not created | **BUG:** Form submitted successfully | **New record created** | Delete user from DB | **FAIL** | `userService.ts`:86 | Hai |
| **Employee Management** | TC_USER_03 | Action: Delete Admin | Delete button hidden for Admin role | Record remains in DB | Delete button hidden as expected | Record remains in DB | N/A | **PASS** | `StaffPage.jsx`:263 | Hai |
| **Statistical Reports** | TC_STAT_01 | Role: Staff, URL: `/admin/revenue` | Redirect to Dashboard or show 403 | No access | Showed 403 Forbidden page | Access denied | N/A | **PASS** | `auth.go`:45 | Hai |
| **Statistical Reports** | TC_STAT_02 | Role: Admin, View: Revenue by Month | Show chart with correct sum | No changes | Chart displayed with correct data | No changes | N/A | **PASS** | `analytics-service.ts`:112 | Hai |
| **Chatbot Documents** | TC_CHAT_01 | File: "movie_policy.pdf" (2MB) | Show "Upload Success" toast | File metadata saved in DB | Upload success toast shown | Metadata saved | Delete file | **PASS** | `DocumentService.ts`:36 | Hai |
| **Chatbot Documents** | TC_CHAT_02 | File: "large_data.pdf" (50MB) | Show error: "File too large" | Record not created | **BUG:** Page hangs/Loading forever | **Server timeout** | N/A | **FAIL** | `DocumentService.ts`:45 | Hai |
| **Movie News** | TC_NEWS_01 | Title: "Holiday Promo", Content: "..." | Show success message | News record created in DB | Success message shown | Record created | Delete news | **PASS** | `news_business.go`:54 | Hai |
| **Movie News** | TC_NEWS_02 | Title: "", Content: "Sample" | Show error: "Title is required" | Record not created | **BUG:** News created with empty title | **Invalid record created** | Delete news | **FAIL** | `news_business.go`:42 | Hai |

## 3. Findings & Recommendations
*   **Critical Issues:** Three bugs were identified where input validation is missing on the frontend/backend (TC_USER_02, TC_NEWS_02) and a performance issue with large file uploads (TC_CHAT_02).
*   **Security:** Role-based access control is working correctly for restricted pages.
*   **Performance:** Reporting features respond well within acceptable timeframes for standard data volumes.

---
*Report generated automatically by Antigravity Selenium Tool.*
