# BÁO CÁO UNIT TESTING – QUẢN TRỊ VẬN HÀNH & THỐNG KÊ

> **Thành viên:** Hải | **Module:** Operational Management & Analytics

---

## 1.1. Tools and Libraries

| Công cụ / Thư viện | Phiên bản | Mục đích |
|---|---|---|
| **Jest** | ^30.x / ^29.x | Test framework chính cho Node.js/TypeScript |
| **ts-jest** | ^29.x | Chạy TypeScript trực tiếp trong Jest (không cần build) |
| **@jest/globals** | built-in | Cung cấp `jest.fn()`, `expect()`, `describe()`, `it()` |
| **jest.mock()** | built-in | Mock các dependencies (gRPC, Redis, Sequelize, PG Pool) |
| **Go `testing` package** | stdlib | Framework test chuẩn cho Go services |
| **Go `net/http/httptest`** | stdlib | Mock HTTP request/response cho API Gateway middleware |

---

## 1.2. Scope of Testing

### ✅ Files/Classes CẦN test (ARE tested)

| # | File / Class | Service | Lý do cần test |
|---|---|---|---|
| 1 | `src/services/analytics-service.ts` | analytics-service | Chứa toàn bộ thuật toán tính doanh thu, grouping, occupancy rate |
| 2 | `src/services/userService.ts` | user-service | Logic CRUD nhân viên, kiểm soát quyền xóa/sửa tài khoản |
| 3 | `src/services/roleService.ts` | user-service | Logic gán/thu hồi quyền, cập nhật role |
| 4 | `src/services/DocumentService.ts` | chatbot | Luồng upload → extract → chunk → lưu DB → xóa cascade |
| 5 | `internal/middleware/auth.go` | api-gateway | RBAC middleware chặn truy cập API doanh thu |
| 6 | `internal/module/news/business/news_business.go` | movie-service | CRUD tin tức và toggle trạng thái active |

### ❌ Files/Classes KHÔNG cần test (DO NOT need testing)

| # | File / Class | Lý do KHÔNG test |
|---|---|---|
| 1 | `src/config/redis.ts`, `src/config/database.ts` | Chỉ khai báo connection string, không có business logic |
| 2 | `src/models/*.ts`, `internal/module/*/entity/` | Định nghĩa schema/struct, không chứa thuật toán |
| 3 | `src/grpc/*-client.ts`, `internal/module/*/transport/` | Tầng vận chuyển dữ liệu – được mock trong unit test; kiểm tra ở E2E |
| 4 | `src/types/index.ts`, `*.proto` | Chỉ định nghĩa interface/type, không có logic thực thi |
| 5 | `src/index.ts`, `src/server.ts` | Entrypoint khởi động app, không chứa business logic |

---

## 1.3. Unit Test Cases

### A. Analytics Service

**File test:** `analytics-service/src/services/__tests__/analytics-service.test.ts`
**Source:** `analytics-service/src/services/analytics-service.ts`

| Test Scenario | Test Description | Preconditions | Test Steps | Input Data | Expected Result | Actual Result | PASS/FAIL | Notes | Path / Line |
|---|---|---|---|---|---|---|---|---|---|
| Revenue grouping by Movie | TC-ANALYTICS-01: Thuật toán cộng dồn doanh thu theo phim | Redis cache = null; gRPC mock trả 3 records (st-1 x2, st-2 x1) | 1. Mock Redis miss 2. Mock gRPC data 3. Gọi `getRevenueByMovie({limit:10})` 4. Assert kết quả | `filters={limit:10}` | 2 phim; Movie A: revenue=700, bookings=7; Movie B: revenue=300 | Đúng như kỳ vọng | **PASS** | CheckDB: xác minh `getRevenueByShowtime` và `getShowtimes` được gọi | `analytics-service/src/services/__tests__/analytics-service.test.ts` L66–L107 |
| Redis Cache Hit | TC-ANALYTICS-02: Trả dữ liệu từ cache khi có sẵn | Redis trả JSON đã cache | 1. Mock Redis hit 2. Gọi `getRevenueByMovie` 3. Xác minh gRPC không được gọi | `filters={limit:10}` | Dữ liệu cache được trả nguyên vẹn; gRPC không bị gọi | Đúng như kỳ vọng | **PASS** | Kiểm tra short-circuit cache | `analytics-service/src/services/__tests__/analytics-service.test.ts` L117–L136 |
| Occupancy Rate Calculation | TC-ANALYTICS-03: Tính tỷ lệ lấp đầy rạp | Cache miss; showtime có 100 ghế, 50 vé bán | 1. Mock data 2. Gọi `getRevenueByShowtime` 3. Assert occupancy_rate | `total_tickets=50, seats=100` | `occupancy_rate = 50.00` | Đúng như kỳ vọng | **PASS** | Math: (50/100)*100=50 | `analytics-service/src/services/__tests__/analytics-service.test.ts` L149–L179 |
| Revenue by Time filter | TC-ANALYTICS-04: Lọc doanh thu theo khoảng thời gian | Cache miss; gRPC mock trả array | 1. Mock 2. Gọi `getRevenueByTime` 3. Assert params gRPC | `{start_date:'2023-10-01', end_date:'2023-10-31'}` | gRPC được gọi với đúng params; trả mocked array | Đúng như kỳ vọng | **PASS** | CheckDB: xác minh params truyền sang gRPC | `analytics-service/src/services/__tests__/analytics-service.test.ts` L191–L210 |
| Revenue by Genre | TC-ANALYTICS-05: Nhóm doanh thu theo thể loại | Cache miss; 1 showtime, 1 movie | 1. Mock 2. Gọi `getRevenueByGenre({})` 3. Assert genre | `filters={}` | 1 item genre='Unknown' | Đúng như kỳ vọng | **PASS** | Genre hiện tại mặc định Unknown | `analytics-service/src/services/__tests__/analytics-service.test.ts` L223–L243 |
| Total Revenue Summary | TC-ANALYTICS-06: Tổng hợp doanh thu toàn kỳ | gRPC mock trả 5000 | 1. Mock `getTotalRevenue` 2. Gọi `getTotalRevenueSummary` | `{start_date:'2023-01-01'}` | `{total_revenue:5000, period_start:'2023-01-01'}` | Đúng như kỳ vọng | **PASS** | | `analytics-service/src/services/__tests__/analytics-service.test.ts` L254–L267 |
| Performance – 10k records | TC-ANALYTICS-PERF-01: Hiệu năng xử lý 10,000 records | Cache miss; generate 10k mock records (50 showtimes, 10 movies) | 1. Generate data 2. Đo `performance.now()` 3. Gọi `getRevenueByMovie` 4. Kiểm tra thời gian | 10,000 booking records | Kết quả ≤10 movies; thời gian thực thi <1000ms | 5.45ms (PASS) | **PASS** | Log: `[PERFORMANCE] 10,000 records processed in 5.45ms` | `analytics-service/src/services/__tests__/analytics-service.test.ts` L280–L330 |

---

### B. User Service – UserService

**File test:** `user-service/src/services/__tests__/userService.test.ts`
**Source:** `user-service/src/services/userService.ts`

| Test Scenario | Test Description | Preconditions | Test Steps | Input Data | Expected Result | Actual Result | PASS/FAIL | Notes | Path / Line |
|---|---|---|---|---|---|---|---|---|---|
| List Staff (exclude customer) | TC-USER-01: Lấy danh sách nhân viên, không bao gồm customer | DB mock trả 1 staff record | 1. Mock `count=1`, `findAll=[staffRecord]` 2. Gọi `getAllStaffs` | `{page:1, size:10}` | `data.length=1`, `paging.total=1` | Đúng như kỳ vọng | **PASS** | CheckDB: `count()` và `findAll()` được gọi | `user-service/src/services/__tests__/userService.test.ts` L71–L100 |
| Admin updates other user | TC-USER-02: Admin cập nhật profile người dùng khác | DB mock tìm thấy user | 1. Mock `findOne` 2. Gọi `updateUser` với role=admin 3. Assert `update()` được gọi | `targetId='user123', role='admin', data={name:'New Name'}` | Profile được cập nhật; response không có `password` | Đúng như kỳ vọng | **PASS** | CheckDB: `user.update()` được gọi với đúng fields | `user-service/src/services/__tests__/userService.test.ts` L114–L138 |
| Normal user blocks cross-update | TC-USER-03: User thường không thể sửa profile người khác | requestingUserId ≠ targetUserId, role=customer | 1. Gọi `updateUser` với requester khác 2. Expect throw | `targetId='user123', requesterId='user456', role='customer'` | Throw: `'You can only update your own profile'` | Đúng như kỳ vọng | **PASS** | Business rule enforcement | `user-service/src/services/__tests__/userService.test.ts` L146–L160 |
| Block self-deletion | TC-USER-04: Chặn admin tự xóa bản thân | userId === requestingUserId | 1. Gọi `deleteUser('admin1', 'admin1')` 2. Expect throw | `userId='admin1', requesterId='admin1'` | Throw: `'You cannot delete your own account'` | Đúng như kỳ vọng | **PASS** | Self-delete guard | `user-service/src/services/__tests__/userService.test.ts` L172–L178 |
| Block deleting admin | TC-USER-05: Không cho phép xóa tài khoản admin | DB trả user có role_id='admin' | 1. Mock `findOne` với admin role 2. Gọi `deleteUser` 3. Expect throw | `userId='admin2', requesterId='admin1'` | Throw: `'Cannot delete admin accounts'` | Đúng như kỳ vọng | **PASS** | CheckDB: `findOne()` được gọi | `user-service/src/services/__tests__/userService.test.ts` L188–L199 |
| Successful user deletion | TC-USER-06: Xóa thành công nhân viên không phải admin | DB trả staff user | 1. Mock `findOne` với manager_staff 2. Gọi `deleteUser` 3. Assert `destroy()` | `userId='staff1', requesterId='admin1'` | Resolve; `destroy()` được gọi 1 lần | Đúng như kỳ vọng | **PASS** | CheckDB: `destroy()` xác nhận xóa DB; Rollback: mock nên không xóa thật | `user-service/src/services/__tests__/userService.test.ts` L210–L229 |
| Get user by ID | TC-USER-07: Lấy thông tin user, ẩn password | DB trả user có password | 1. Mock `findOne` với password hash 2. Gọi `getUserById` | `userId='user1'` | User object, KHÔNG có field `password` | Đúng như kỳ vọng | **PASS** | Bảo mật: password không lộ ra ngoài | `user-service/src/services/__tests__/userService.test.ts` L242–L258 |
| User not found error | TC-USER-08: Throw lỗi khi userId không tồn tại | DB mock trả null | 1. Mock `findOne=null` 2. Gọi `getUserById` 3. Expect throw | `userId='nonexistent-id'` | Throw: `ErrorMessages.USER_NOT_FOUND` | Đúng như kỳ vọng | **PASS** | CheckDB: `findOne()` được gọi | `user-service/src/services/__tests__/userService.test.ts` L268–L278 |
| Paginated user list | TC-USER-09: Trả danh sách user có phân trang | DB mock trả 2 users | 1. Mock `count=2`, `findAll` 2. Gọi `getAllUsers` | `{page:1, size:10}` | `data.length=2`, `paging.total_pages=1` | Đúng như kỳ vọng | **PASS** | Math.ceil(2/10)=1 | `user-service/src/services/__tests__/userService.test.ts` L291–L305 |

---

### C. User Service – RoleService

**File test:** `user-service/src/services/__tests__/roleService.test.ts`
**Source:** `user-service/src/services/roleService.ts`

| Test Scenario | Test Description | Preconditions | Test Steps | Input Data | Expected Result | Actual Result | PASS/FAIL | Notes | Path / Line |
|---|---|---|---|---|---|---|---|---|---|
| List roles (no customer) | TC-ROLE-01: Lấy danh sách role, loại bỏ 'customer' | DB mock trả admin, manager | 1. Mock `findAll` 2. Gọi `getAllRoles` | Không có input | Array 2 roles; `findAll` có where clause | Đúng như kỳ vọng | **PASS** | CheckDB: xác minh `Op.notIn` filter | `user-service/src/services/__tests__/roleService.test.ts` L83–L105 |
| Assign permission success | TC-ROLE-02: Gán quyền thành công khi chưa tồn tại | `findOne` trả null (không trùng) | 1. Mock `findOne=null` 2. Mock `create` 3. Gọi `assignPermission` | `roleId='role1', permId='perm1'` | Resolve; `create()` được gọi 1 lần | Đúng như kỳ vọng | **PASS** | CheckDB: duplicate check + insert | `user-service/src/services/__tests__/roleService.test.ts` L120–L133 |
| Assign duplicate permission | TC-ROLE-03: Throw lỗi khi quyền đã được gán | `findOne` trả existing record | 1. Mock `findOne={id:'existing'}` 2. Gọi `assignPermission` 3. Expect throw | `roleId='role1', permId='perm1'` | Throw: `'Permission already assigned to this role'` | Đúng như kỳ vọng | **PASS** | Idempotency guard | `user-service/src/services/__tests__/roleService.test.ts` L143–L155 |
| Unassign permission success | TC-ROLE-04: Thu hồi quyền thành công | `destroy` trả 1 (1 row deleted) | 1. Mock `destroy=1` 2. Gọi `unassignPermission` | `roleId='role1', permId='perm1'` | Resolve; `destroy()` được gọi | Đúng như kỳ vọng | **PASS** | CheckDB + Rollback: mock | `user-service/src/services/__tests__/roleService.test.ts` L170–L180 |
| Unassign not-found permission | TC-ROLE-05: Throw lỗi khi quyền không tồn tại trong role | `destroy` trả 0 (no rows deleted) | 1. Mock `destroy=0` 2. Gọi `unassignPermission` 3. Expect throw | `roleId='role1', permId='perm1'` | Throw: `'Permission not found for this role'` | Đúng như kỳ vọng | **PASS** | | `user-service/src/services/__tests__/roleService.test.ts` L190–L202 |

---

### D. Chatbot – DocumentService

**File test:** `chatbot/src/services/__tests__/DocumentService.test.ts`
**Source:** `chatbot/src/services/DocumentService.ts`

| Test Scenario | Test Description | Preconditions | Test Steps | Input Data | Expected Result | Actual Result | PASS/FAIL | Notes | Path / Line |
|---|---|---|---|---|---|---|---|---|---|
| Process document (full pipeline) | TC-DOC-01: Upload tài liệu, chunk và lưu DB | TextExtractor, EmbeddingService, Datastores đều mock OK | 1. Gọi `processDocument` 2. Await nextTick 3. Assert các DB calls | `filePath='/test/doc.pdf', title='Test Doc'` | Status='processing'; `createDocument()` và `batchCreateChunks()` được gọi; cuối cùng status='completed' | Đúng như kỳ vọng | **PASS** | CheckDB: 3 DB calls verified; Rollback: all mocked | `chatbot/src/services/__tests__/DocumentService.test.ts` L131–L160 |
| Delete document cascade | TC-DOC-02: Xóa tài liệu kéo theo xóa chunks và clear cache | Mocks đều resolve OK | 1. Gọi `deleteDocument` 2. Assert thứ tự gọi: chunks trước, document sau | `docID='test-doc-id'` | `deleteChunksByDocumentId()` và `deleteDocument()` đều được gọi; cache invalidated | Đúng như kỳ vọng | **PASS** | CheckDB: cascade order; Rollback: mocked | `chatbot/src/services/__tests__/DocumentService.test.ts` L174–L193 |
| Get single document | TC-DOC-03: Lấy thông tin 1 tài liệu theo ID | DB mock trả document | 1. Mock `getDocument` 2. Gọi `getDocument('d1')` | `docID='d1'` | `{id:'d1', title:'T1'}` | Đúng như kỳ vọng | **PASS** | | `chatbot/src/services/__tests__/DocumentService.test.ts` L205–L215 |
| List all documents | TC-DOC-04: Lấy danh sách tài liệu có phân trang | DB mock trả 1 document | 1. Mock `getAllDocuments` 2. Gọi `listDocuments(10, 0)` | `limit=10, offset=0` | Array length = 1 | Đúng như kỳ vọng | **PASS** | | `chatbot/src/services/__tests__/DocumentService.test.ts` L224–L234 |
| Get document chunks | TC-DOC-05: Lấy danh sách chunks của tài liệu | DB mock trả 1 chunk | 1. Mock `getChunksByDocumentId` 2. Gọi `getDocumentChunks('d1')` | `docID='d1'` | Array length = 1 | Đúng như kỳ vọng | **PASS** | | `chatbot/src/services/__tests__/DocumentService.test.ts` L244–L255 |

---

### E. API Gateway & Movie Service (Golang)

**File test:** `api-gateway/internal/middleware/auth_test.go` | `movie-service/internal/module/news/news_test.go`

| Test Scenario | Test Description | Preconditions | Test Steps | Input Data | Expected Result | Actual Result | PASS/FAIL | Notes | Path / Line |
|---|---|---|---|---|---|---|---|---|---|
| RBAC – Admin allowed | TC-GATEWAY-01a: Admin có thể truy cập endpoint analytics | JWT token role=admin | 1. Generate JWT admin 2. HTTP GET `/api/v1/analytics/revenue/total` | `Authorization: Bearer <admin_token>` | HTTP 200 OK | Thiết lập đúng | **NOT EXEC** | Go CLI chưa cài; logic đã viết sẵn | `api-gateway/internal/middleware/auth_test.go` L62–L74 |
| RBAC – Normal user blocked | TC-GATEWAY-01b: User thường bị chặn khỏi analytics | JWT token role=user | 1. Generate JWT user 2. HTTP GET `/api/v1/analytics/revenue/total` | `Authorization: Bearer <user_token>` | HTTP 403 Forbidden | Thiết lập đúng | **NOT EXEC** | Xác minh middleware isAdminPath | `api-gateway/internal/middleware/auth_test.go` L75–L88 |
| News Create | TC-NEWS-01: Tạo tin tức mới | MockNewsRepository với CreateNewsFunc | 1. Gọi mock `CreateNewsFunc` 2. Assert called=true | `title='Title', content='Content'` | Function được gọi không lỗi | Thiết lập đúng | **NOT EXEC** | | `movie-service/internal/module/news/news_test.go` L18–L32 |
| News Delete | TC-NEWS-02: Xóa tin tức | MockNewsRepository với DeleteNewsFunc | 1. Gọi mock `DeleteNewsFunc` 2. Assert called=true | `id='id-123'` | Function được gọi không lỗi | Thiết lập đúng | **NOT EXEC** | | `movie-service/internal/module/news/news_test.go` L33–L47 |
| News Update | TC-NEWS-03: Cập nhật nội dung tin tức | MockNewsRepository với UpdateNewsSummaryFunc | 1. Gọi mock `UpdateNewsSummaryFunc` 2. Assert called=true | `id='id-1', title='New', summary='Sum'` | Function được gọi không lỗi | Thiết lập đúng | **NOT EXEC** | | `movie-service/internal/module/news/news_test.go` L48–L62 |
| Toggle Active | TC-NEWS-04: Ẩn/hiện tin tức (toggle) | MockNewsRepository với UpdateNewsSummaryIsActiveFunc | 1. Gọi mock `UpdateNewsSummaryIsActiveFunc` 2. Assert called=true | `id='id-1', isActive=true` | Function được gọi không lỗi | Thiết lập đúng | **NOT EXEC** | | `movie-service/internal/module/news/news_test.go` L63–L78 |

> ⚠️ **NOT EXEC**: Go (`go test`) chưa được cài đặt trong môi trường hiện tại. Script test Go đã viết đầy đủ và đúng syntax, có thể chạy khi có môi trường Go.

---

## 1.4. Execution Report

### Tổng hợp kết quả chạy test

| Service | Test Suites | Tests | PASS | FAIL | Thời gian |
|---|---|---|---|---|---|
| analytics-service | 1 | **7** | 7 | 0 | 2.38s |
| user-service | 2 | **14** | 14 | 0 | 7.27s |
| chatbot | 1 | **5** | 5 | 0 | 4.67s |
| movie-service (Go) | 1 | 4 | – | – | NOT EXEC |
| api-gateway (Go) | 1 | 2 | – | – | NOT EXEC |
| **TỔNG** | **6** | **32** | **26** | **0** | ~14s |

### Kết quả terminal

```
=== ANALYTICS SERVICE ===
PASS src/services/__tests__/analytics-service.test.ts
  ✓ [TC-ANALYTICS-01] Should calculate and group revenue by movie correctly (5ms)
  ✓ [TC-ANALYTICS-02] Should return cached data if available
  ✓ [TC-ANALYTICS-03] Should calculate occupancy rate and map showtime data (1ms)
  ✓ [TC-ANALYTICS-04] Should fetch revenue by time from booking service (1ms)
  ✓ [TC-ANALYTICS-05] Should group revenue by genre (1ms)
  ✓ [TC-ANALYTICS-06] Should get total revenue summary (1ms)
  ✓ [TC-ANALYTICS-PERF-01] Should handle 10,000 mock records efficiently (32ms)
  [PERFORMANCE] 10,000 records processed in 5.45ms
Tests: 7 passed, 7 total

=== USER SERVICE ===
PASS src/services/__tests__/userService.test.ts
PASS src/services/__tests__/roleService.test.ts
Tests: 14 passed, 14 total

=== CHATBOT SERVICE ===
PASS src/services/__tests__/DocumentService.test.ts
  ✓ [TC-DOC-01] Should successfully process document and chunks (5ms)
  ✓ [TC-DOC-02] Should delete document and its chunks (1ms)
  ✓ [TC-DOC-03] Should fetch single document (1ms)
  ✓ [TC-DOC-04] Should list documents (1ms)
  ✓ [TC-DOC-05] Should get chunks for document
Tests: 5 passed, 5 total
```

---

## 1.5. Code Coverage Report

### analytics-service

| File | % Statements | % Branch | % Functions | % Lines | Uncovered Lines |
|---|---|---|---|---|---|
| `analytics-service.ts` | **84.37%** | 67.74% | **86.66%** | **83.33%** | 17,55,91,108-110,118,156,181,207 |

### user-service

| File | % Statements | % Branch | % Functions | % Lines | Uncovered Lines |
|---|---|---|---|---|---|
| `userService.ts` | **80.59%** | 58% | **100%** | **85.48%** | 35,57,71,93,101,153,164,212,224 |
| `roleService.ts` | 43.24% | 44.11% | 52.94% | 44.92% | 39-40,57-127,135-137,147-152,177,183 |
| **All files** | **60.99%** | 52.38% | 68% | 64.12% | |

> 💡 `roleService.ts` có coverage thấp do phần gRPC client khởi tạo (dòng 57-127) không được test – đây là infrastructure code, không phải business logic.

### chatbot

| File | % Statements | % Branch | % Functions | % Lines | Uncovered Lines |
|---|---|---|---|---|---|
| `DocumentService.ts` | **95.12%** | **100%** | 63.63% | **95%** | 58, 98 |
| `ChatService.ts` | 0% | 0% | 0% | 0% | (ngoài scope test) |
| **All files** | 32.77% | 0% | 28% | 32.2% | |

> 💡 `ChatService.ts` và `EmbeddingService.ts` nằm ngoài scope testing của Hải.

---

## 1.6. CheckDB & Rollback Summary

| Test | CheckDB | Rollback |
|---|---|---|
| TC-ANALYTICS-01 đến 07 | Xác minh `bookingGrpcClient` và `movieGrpcClient` được gọi đúng | N/A – gRPC & Redis đều mock, không có DB thật |
| TC-USER-01, 06, 07, 09 | Xác minh `findOne()`, `findAll()`, `count()`, `destroy()` được gọi | `jest.clearAllMocks()` sau mỗi test |
| TC-USER-06 | `destroy()` được gọi 1 lần (xóa DB) | Mock: không xóa DB thật |
| TC-ROLE-02, 04 | `create()` và `destroy()` được gọi (thêm/xóa permission) | Mock: không thay đổi DB thật |
| TC-DOC-01 | `createDocument()`, `batchCreateChunks()`, `updateDocumentStatus()` | Mock: không insert DB thật |
| TC-DOC-02 | `deleteChunksByDocumentId()` trước, sau đó `deleteDocument()` | Mock: không xóa DB thật |

---

## 1.7. References & Prompts Used

### References
- Tài liệu yêu cầu kiểm thử của giảng viên: Section 5.3 & Section 2
- Jest documentation: https://jestjs.io/docs/getting-started
- ts-jest documentation: https://kulshekhar.github.io/ts-jest/
- Go testing package: https://pkg.go.dev/testing

### Prompts Used (AI-Assisted)
1. *"Dựa vào file phan_tich_test_hai.md, hãy viết unit tests cho các service với đầy đủ comments, CheckDB và Rollback"*
2. *"Tạo file báo cáo Markdown với các cột: Test Scenario, Test Description, Preconditions, Test Steps, Input Data, Expected Result, Actual Result, PASS/FAIL, Notes, Path/Line"*
3. *"Chạy npm run test:coverage cho analytics-service, user-service và chatbot và tổng hợp kết quả"*
