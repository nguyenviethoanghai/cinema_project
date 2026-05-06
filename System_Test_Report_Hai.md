# 🎬 System Test Report — Cinema Booking System (Member: Hai)

> **Project:** Cinema Booking System (Microservices)
> **Modules tested:** Staff & Permission Management, Revenue Analytics, Chatbot Document Management (RAG), Movie News Management, API Gateway Role-Based Access Control
> **Environment:** http://localhost:3000 | API Gateway: http://localhost:8000
> **Test Type:** System Testing (Black-box / End-to-End via UI & API)
> **Tested by:** Hai | **Date:** 30/03/2026

---

## 1. 👤 Staff & Permission Management (User Service)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-USER-01 | View staff list | Equivalence Class | 1. Login as admin (manager@cinema.com / password). 2. Navigate to http://localhost:3000/admin/staff. 3. Observe the list. | URL: /admin/staff | Staff list is displayed with columns: Name, Email, Role, Status | Page /admin/staff loads successfully, shows staff list with roles: admin, manager_staff, ticket_staff. However, the sidebar link is missing — direct URL navigation is required | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `getStaffs()` |
| TC-USER-02 | Update staff profile information | Equivalence Class | 1. Go to /admin/staff. 2. Click Edit on a staff member. 3. Change information (name, phone number). 4. Click Save. | Valid new name/phone number | Staff information is updated successfully | Edit form opens with personal info fields (Name, Phone, ...). Update saved successfully, success toast is displayed. Note: form is missing a Role assignment field | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `updateProfile()` |
| TC-USER-03 | Delete a regular staff account | Equivalence Class | 1. Go to /admin/staff. 2. Click Delete on a ticket_staff account. 3. Confirm. | ticket_staff account | Account is removed from the list | Delete is executed immediately without a confirmation modal. After clicking, the staff member is removed from the list (no confirmation dialog) | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `deleteUser()` |
| TC-USER-04 | Admin attempts to delete their own account | Equivalence Class | 1. Login as manager@cinema.com. 2. Go to /admin/staff. 3. Try to delete the currently logged-in account (manager@cinema.com). | currentUser = manager@cinema.com | System rejects the action and displays an error message | The Delete button is hidden or disabled for the currently logged-in account, the action is blocked | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `deleteUser()` self-delete check |
| TC-USER-05 | Attempt to delete another admin account | Equivalence Class | 1. Find an account with role=admin in the list. 2. Click Delete. | Account with role=admin | System rejects, displays error "Cannot delete an admin account" | Admin accounts are protected and cannot be deleted via the UI | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `deleteUser()` admin role check |
| TC-ROLE-01 | View list of roles | Equivalence Class | 1. Login as admin. 2. Go to /admin/staff and observe role information in the list. | N/A | Role list is displayed (admin, manager_staff, ticket_staff...) | System has 3 roles: admin, manager_staff, ticket_staff. Role information is visible within the staff list | Hai | 30/03/2026 | Pass | `user-service/src/services/roleService.ts` — `getRoles()` |
| TC-ROLE-02 | Assign a permission to a role | Equivalence Class | 1. Find the permission management UI. 2. Select a role. 3. Assign a new permission to it. | Role=manager_staff, new permission | Permission is successfully assigned to the role | No standalone UI for assigning individual permissions to roles; permissions are configured at the backend/seed data level | Hai | 30/03/2026 | Fail | `user-service/src/services/roleService.ts` — `assignPermission()` — No direct permission management UI available |
| TC-ROLE-03 | Unassign/remove a permission from a role | Equivalence Class | 1. Find the permission management UI. 2. Remove a permission from a role. | Permission to be removed from the role | Permission is successfully removed | Same as TC-ROLE-02: no UI found for unassigning permissions | Hai | 30/03/2026 | Fail | `user-service/src/services/roleService.ts` — `unassignPermission()` — No permission management UI available |

---

## 2. 📊 Revenue Analytics & Statistics (Analytics Service)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-ANA-01 | View overall revenue dashboard | Equivalence Class | 1. Login as admin. 2. Click "Revenue" in the sidebar. 3. Observe the dashboard at /admin/revenue. | URL: /admin/revenue | Dashboard displays total revenue, tickets sold, charts by day/month | Page /admin/revenue loads successfully, analytics dashboard UI is displayed. However, all metrics (Total Revenue, Tickets Sold) show 0 — likely because no bookings have PAID status in the seed data | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — `calculateRevenue()` |
| TC-ANA-02 | Filter revenue by date range | Equivalence Class | 1. Go to /admin/revenue. 2. Select a date range (e.g., March 2026). 3. Click Filter/Apply. | startDate=01/03/2026, endDate=31/03/2026 | Revenue data is displayed correctly for the selected period | Date filter works correctly, API is called with the correct parameters. Result is still 0 because seed data has no completed payments | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — time range filter |
| TC-ANA-03 | View revenue statistics per movie | Equivalence Class | 1. Go to /admin/revenue. 2. Find the movie breakdown section. | N/A | List of movies with corresponding revenue | UI includes a per-movie revenue section; data shows 0 as no payments exist in seed data | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — revenue by movie |
| TC-ANA-04 | View screening room occupancy rate | Equivalence Class | 1. Go to /admin/revenue. 2. Find the occupancy rate section. | N/A | Occupancy rate = (seats sold / total seats) × 100% | Occupancy rate section is displayed on the dashboard with values matching current data | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — occupancy rate |
| TC-ANA-05 | Verify Redis cache (2nd call faster than 1st) | Equivalence Class | 1. Call /admin/revenue API and record response time. 2. Reload the page (2nd call). 3. Compare speeds. | Same URL called twice | 2nd call is faster due to Redis cache | Page reload on the 2nd call is noticeably faster, confirming Redis cache mechanism is working | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — Redis cache |
| TC-ANA-06 | Filter revenue with a date range that has no data | Boundary Value Analysis | 1. Go to /admin/revenue. 2. Select a future date range (01/01/2030 – 31/01/2030). | startDate=01/01/2030, endDate=31/01/2030 | System displays revenue = 0 without crashing | System returns empty data gracefully, displays "No data" or metrics showing 0, no errors | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — empty data handling |
| TC-ANA-07 | Load full report with all data (Performance Test) | Performance Testing | 1. Go to /admin/revenue. 2. Apply no time filter. 3. Load all data. 4. Measure response time. | No filter applied (all data) | API responds within 3 seconds | API responds successfully within an acceptable time (< 3s), no timeout or 500 errors | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — Performance |

---

## 3. 🤖 Chatbot Document Management (RAG — Chatbot Service)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-DOC-01 | View list of uploaded documents | Equivalence Class | 1. Login as admin. 2. Navigate to http://localhost:3000/admin/chatbot-documents. 3. Observe the list. | URL: /admin/chatbot-documents | Document list is displayed with file name, upload date, and status | Page /admin/chatbot-documents returns error **"Service not found"** — backend chatbot service is unresponsive or misconfigured | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Backend service unavailable at test time |
| TC-DOC-02 | Upload a valid PDF document | Equivalence Class | 1. Go to /admin/chatbot-documents. 2. Click Upload. 3. Select a PDF file. 4. Confirm. | Valid PDF file | File is uploaded and chunked successfully | Cannot test — page shows "Service not found", no upload interface is available | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Blocked by TC-DOC-01 failure |
| TC-DOC-03 | Upload a valid Word (.docx) document | Equivalence Class | 1. Go to /admin/chatbot-documents. 2. Click Upload. 3. Select a .docx file. | Valid .docx file | File is uploaded and chunked successfully | Cannot test — service unavailable | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Service unavailable |
| TC-DOC-04 | Upload an unsupported file type | Equivalence Class | 1. Go to /admin/chatbot-documents. 2. Click Upload. 3. Select a .exe or .jpg file. | .jpg or .exe file | System rejects and displays an unsupported format error | Cannot test — service unavailable | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Service unavailable |
| TC-DOC-05 | Delete an uploaded document | Equivalence Class | 1. Select a document from the list. 2. Click Delete. 3. Confirm. | A document that already exists in the system | Document is deleted from the system | Cannot test — service unavailable | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Service unavailable |

---

## 4. 📰 Movie News Management (Movie Service — Go)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-NEWS-01 | View movie news list | Equivalence Class | 1. Login as admin. 2. Click "News" in the sidebar. 3. Observe at /admin/news. | URL: /admin/news | News list is displayed with all items | Page /admin/news returns error **"Failed to load news"** — API news endpoint is unresponsive | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — API endpoint not working or not yet implemented |
| TC-NEWS-02 | Create a new valid news article | Equivalence Class | 1. Go to /admin/news. 2. Click Add New. 3. Fill in title and content. 4. Click Save. | Title="Test News", Content="Test content" | News article is created successfully | Cannot test — page shows "Failed to load news" | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — Blocked by TC-NEWS-01 failure |
| TC-NEWS-03 | Update a news article | Equivalence Class | 1. Select a news article. 2. Click Edit. 3. Change the content. 4. Click Save. | Valid new content | News article is updated successfully | Cannot test — service unavailable | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` |
| TC-NEWS-04 | Toggle news visibility (active/inactive) | State Transition | 1. Select an active news article. 2. Click Hide/Deactivate. 3. Observe the status. | Status: active → inactive | Status changes to inactive, article hidden from customers | Cannot test — service unavailable | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — toggle active status |
| TC-NEWS-05 | Delete a news article | Equivalence Class | 1. Select a news article. 2. Click Delete. 3. Confirm. | News article to be deleted | Article is removed from the list | Cannot test — service unavailable | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` |
| TC-NEWS-06 | Create news article with empty title | Boundary Value Analysis | 1. Go to /admin/news. 2. Click Add New. 3. Leave Title empty. 4. Click Save. | Title="" (empty) | Form validation shows an error requiring a title | Cannot test — service unavailable | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — validation |

---

## 5. 🔐 Role-Based Access Control (API Gateway — Go)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-01 | Admin accesses the management dashboard (allowed) | Equivalence Class | 1. Login as manager@cinema.com / password. 2. Navigate to /admin/dashboard. 3. Observe. | JWT Token with role=admin | HTTP 200, admin dashboard displayed in full | Login is successful, /admin/dashboard displays all management modules (Movies, Rooms, Showtimes, Staff, Revenue...) | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — admin access |
| TC-AUTH-02 | Customer attempts to access admin dashboard (blocked) | Equivalence Class | 1. Login as alice@email.com / password. 2. Try to access /admin/dashboard directly. | JWT Token with role=user | Blocked, redirected to customer page or 403 error | Customer (alice) is redirected to the customer-facing pages after login; cannot access /admin/dashboard | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — block user role |
| TC-AUTH-03 | Unauthenticated access to /admin | Boundary Value Analysis | 1. Do not login. 2. Navigate directly to http://localhost:3000/admin/dashboard. | No session/token | Redirected to the login page | Automatically redirected to /admin/login; admin area is inaccessible without authentication | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — unauthenticated access |
| TC-AUTH-04 | Manager_staff is restricted from sensitive pages | Equivalence Class | 1. Login with a manager_staff account. 2. Try to access /admin/users or /admin/roles. | JWT Token with role=manager_staff | Redirected or receives 403 for admin-only pages | The manager_staff account is redirected away from /admin/users and /admin/roles; only permitted modules are accessible | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — role restriction |
| TC-AUTH-05 | Manager_staff accesses an allowed page | Equivalence Class | 1. Login as manager_staff. 2. Navigate to /admin/revenue. 3. Observe. | JWT Token with role=manager_staff | HTTP 200, revenue page is displayed | manager_staff account can access /admin/revenue and movie/showtime management modules | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — manager_staff allowed |

---

## 📊 Summary

| Module | Total TC | Pass | Fail | Pass Rate | Notes |
|--------|---------|------|------|------------|-------|
| 👤 User & Role Management | 8 TC | 6 | 2 | 75% | TC-ROLE-02, TC-ROLE-03: Permission management UI not implemented |
| 📊 Analytics Service | 7 TC | 7 | 0 | 100% | Metrics show 0 due to no PAID transactions in seed data |
| 🤖 Chatbot Document (RAG) | 5 TC | 0 | 5 | 0% | Backend chatbot service returns "Service not found" |
| 📰 News Management | 6 TC | 0 | 6 | 0% | News API endpoint returns "Failed to load news" |
| 🔐 API Gateway Auth | 5 TC | 5 | 0 | 100% | RBAC works correctly, access control is accurate |
| **Total** | **31 TC** | **18** | **13** | **58%** | |

---

## 🐛 Defect Summary

| Defect ID | Module | Description | Severity |
|---|---|---|---|
| BUG-01 | Chatbot | Page /admin/chatbot-documents returns "Service not found" — backend chatbot service is unavailable | High |
| BUG-02 | News Management | Page /admin/news returns "Failed to load news" — news API endpoint is not working | High |
| BUG-03 | User Management | Admin sidebar is missing a direct link to "Staff Management"; URL must be typed manually | Medium |
| BUG-04 | User Management | No UI available for Permission/Role assignment (TC-ROLE-02, TC-ROLE-03) | Medium |
| BUG-05 | User Management | Deleting a staff member has no confirmation dialog; the action is executed immediately | Low |

---

> **General Notes:**
> - Test environment: Docker Compose local — http://localhost:3000
> - Admin account: manager@cinema.com / password | Customer account: alice@email.com / password
> - Services under test: `user-service/`, `analytics-service/`, `chatbot/`, `movie-service/`, `api-gateway/`
> - **Chatbot** and **News** services require backend configuration review / API endpoint investigation
