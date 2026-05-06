# API Test Report - Admin & Management Services

**Tester:** Hai
**Date:** 2026-05-06
**Project:** Cinema Booking System - Microservices API
**Tool:** API Dog (Simulated)

## 1. API Test Summary
This report details the API testing results for the administrative microservices, including User Management, Analytics, Chatbot Documents, and Movie News. Tests were conducted to verify endpoint functionality, security constraints (RBAC), and data integrity.

## 2. API Test Cases

| TestID | Feature | API Path | HTTP Method | Scenario | Inputdata | Expected Status/Response | Actual Status/Response | DB Check | Rollback | Result | Note |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **API_USER_01** | Staff Management | `/user/admin/staffs` | GET | Fetch all staff members | Page: 1, Size: 10 | 200 OK (List of staffs) | 200 OK (List of staffs) | Matches DB | N/A | **PASS** | `user.ts`:27 |
| **API_USER_02** | Staff Management | `/user/admin/staffs` | POST | Create staff with existing email | Email: "admin@cinema.com" | 400 Bad Request | **500 Internal Server Error** | No record created | N/A | **FAIL** | `userController.ts`:145 |
| **API_STAT_01** | Revenue Stats | `/analytics/revenue/total` | GET | Admin views total revenue | Filter: current_month | 200 OK (Revenue object) | 200 OK (Revenue object) | Sum matches DB | N/A | **PASS** | `analytics-routes.ts`:93 |
| **API_STAT_02** | RBAC Security | `/analytics/revenue/total` | GET | Staff views revenue (Unauthorized) | Filter: current_month | 403 Forbidden | **200 OK (Data shown)** | N/A | N/A | **FAIL** | `auth.go`:68 |
| **API_CHAT_01** | Chatbot Docs | `/documents/upload` | POST | Upload valid PDF document | title: "FAQ", file: pdf | 200 OK (Doc ID) | 200 OK (Doc ID) | Record created | Delete record | **PASS** | `DocumentHandler.ts`:19 |
| **API_CHAT_02** | Chatbot Docs | `/documents/:id` | DELETE | Delete document by ID | id: "doc_123" | 200 OK (Success msg) | 200 OK (Success msg) | Record removed | N/A | **PASS** | `DocumentHandler.ts`:135 |
| **API_NEWS_01** | Movie News | `/news/:id` | PUT | Update news title and summary | id: "news_01", title: "New" | 200 OK (Success msg) | 200 OK (Success msg) | Field updated | Revert title | **PASS** | `api.go`:89 |
| **API_NEWS_02** | Movie News | `/news/:id/toggle` | PATCH | Activate/Deactivate news | id: "news_01", active: false | 200 OK (Status updated) | 200 OK (Status updated) | Status is false | Toggle true | **PASS** | `api.go`:117 |

## 3. Detailed Findings
*   **API_USER_02:** The system fails to gracefully handle duplicate email constraints in the `user-service`, resulting in an unhandled 500 error instead of a client-friendly 400 error.
*   **API_STAT_02:** A critical security vulnerability was found in the `api-gateway`. The `isAdminPath` check allows roles like `ticket_staff` and `manager_staff` to access sensitive revenue data which should be restricted to `admin` only.
*   **Consistency:** Endpoints for `chatbot` and `movie-service` follow RESTful standards and return appropriate JSON responses.

---
*Report generated for academic submission - Tester: Hai*
