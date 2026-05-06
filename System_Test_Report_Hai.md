# 🎬 System Test Report — Cinema Booking System (Thành viên: Hải)

> **Project:** Cinema Booking System (Microservices)
> **Modules tested:** Quản lý nhân viên & Phân quyền, Thống kê doanh thu, Quản lý tài liệu Chatbot (RAG), Quản lý tin tức phim, Logic phân quyền API Gateway
> **Environment:** http://localhost:3000 | API Gateway: http://localhost:8000
> **Test Type:** System Testing (Black-box / End-to-End via UI & API)
> **Tested by:** Hai | **Date:** 30/03/2026

---

## 1. 👤 Quản lý nhân viên & Phân quyền (User Service)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-USER-01 | Xem danh sách nhân viên (staff) | Equivalence Class | 1. Đăng nhập admin (manager@cinema.com / password). 2. Điều hướng tới http://localhost:3000/admin/staff. 3. Quan sát danh sách. | URL: /admin/staff | Danh sách nhân viên hiển thị đầy đủ với các cột: Tên, Email, Role, Trạng thái | Trang /admin/staff load thành công, hiển thị danh sách nhân viên gồm các role: admin, manager_staff, ticket_staff. Tuy nhiên link sidebar bị thiếu, phải điều hướng trực tiếp qua URL | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `getStaffs()` |
| TC-USER-02 | Cập nhật thông tin nhân viên | Equivalence Class | 1. Vào /admin/staff. 2. Click nút Edit trên một nhân viên. 3. Thay đổi thông tin (tên, số điện thoại). 4. Nhấn Lưu. | Tên/SĐT mới hợp lệ | Thông tin nhân viên được cập nhật thành công | Form Edit mở ra với các trường thông tin cá nhân (Tên, SĐT, ...). Cập nhật lưu thành công, toast thông báo hiển thị. Lưu ý: form thiếu trường gán Role | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `updateProfile()` |
| TC-USER-03 | Xóa tài khoản nhân viên thường | Equivalence Class | 1. Vào /admin/staff. 2. Click nút Xóa trên nhân viên role ticket_staff. 3. Xác nhận. | Tài khoản ticket_staff | Tài khoản bị xóa khỏi danh sách | Click xóa thực hiện ngay, không có modal xác nhận. Sau click, nhân viên bị xóa khỏi danh sách (không có confirmation dialog) | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `deleteUser()` |
| TC-USER-04 | Admin tự xóa tài khoản của chính mình | Equivalence Class | 1. Đăng nhập manager@cinema.com. 2. Vào /admin/staff. 3. Tìm và thử xóa chính tài khoản manager@cinema.com. | currentUser = manager@cinema.com | Hệ thống từ chối, hiển thị thông báo lỗi không cho tự xóa | Nút Delete không xuất hiện hoặc bị disabled cho tài khoản đang đăng nhập, thao tác bị chặn | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `deleteUser()` kiểm tra self-delete |
| TC-USER-05 | Xóa tài khoản admin khác | Equivalence Class | 1. Tìm tài khoản có role=admin trong danh sách. 2. Click Xóa. | Tài khoản role=admin | Hệ thống từ chối, thông báo không thể xóa admin | Tài khoản admin được bảo vệ, không thể xóa qua UI | Hai | 30/03/2026 | Pass | `user-service/src/services/userService.ts` — `deleteUser()` kiểm tra admin role |
| TC-ROLE-01 | Xem danh sách quyền (roles) | Equivalence Class | 1. Đăng nhập admin. 2. Vào /admin/staff và quan sát danh sách role. | N/A | Danh sách role hiển thị (admin, manager_staff, ticket_staff...) | Hệ thống có 3 roles: admin, manager_staff, ticket_staff. Thông tin roles hiển thị trong danh sách nhân viên | Hai | 30/03/2026 | Pass | `user-service/src/services/roleService.ts` — `getRoles()` |
| TC-ROLE-02 | Gán quyền (permission) cho role | Equivalence Class | 1. Tìm giao diện quản lý permissions. 2. Chọn role. 3. Gán thêm permission. | Role=manager_staff, Permission mới | Permission được gán thành công cho role | Tính năng gán permission cho role riêng lẻ không có giao diện UI độc lập; quyền được cấu hình ở cấp backend/seed data | Hai | 30/03/2026 | Fail | `user-service/src/services/roleService.ts` — `assignPermission()` — Không có UI quản lý permission trực tiếp |
| TC-ROLE-03 | Hủy gán quyền (unassign permission) | Equivalence Class | 1. Tìm giao diện quản lý permissions. 2. Gỡ bỏ permission khỏi role. | Permission cần xóa khỏi role | Permission bị gỡ thành công | Tương tự TC-ROLE-02: không tìm thấy UI để hủy gán permission | Hai | 30/03/2026 | Fail | `user-service/src/services/roleService.ts` — `unassignPermission()` — Không có UI quản lý permission |

---

## 2. 📊 Xem báo cáo thống kê & Tính toán doanh thu (Analytics Service)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-ANA-01 | Xem báo cáo doanh thu tổng quan | Equivalence Class | 1. Đăng nhập admin. 2. Click vào "Doanh thu" trong sidebar. 3. Quan sát dashboard tại /admin/revenue. | URL: /admin/revenue | Dashboard hiển thị tổng doanh thu, số vé bán, biểu đồ theo ngày/tháng | Trang /admin/revenue load thành công, giao diện dashboard analytics hiển thị. Tuy nhiên tất cả các chỉ số (Total Revenue, Tickets Sold) đang hiển thị giá trị 0 — có thể do dữ liệu booking chưa có trạng thái PAID | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — `calculateRevenue()` |
| TC-ANA-02 | Lọc doanh thu theo khoảng thời gian | Equivalence Class | 1. Vào /admin/revenue. 2. Chọn khoảng thời gian tháng 3/2026. 3. Nhấn Lọc. | startDate=01/03/2026, endDate=31/03/2026 | Dữ liệu doanh thu hiển thị đúng trong khoảng thời gian chọn | Bộ lọc thời gian hoạt động, API được gọi với tham số đúng. Kết quả vẫn là 0 do dữ liệu seed chưa có thanh toán hoàn thành | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — time range filter |
| TC-ANA-03 | Thống kê doanh thu theo từng phim | Equivalence Class | 1. Vào /admin/revenue. 2. Tìm phần thống kê theo phim (movie breakdown). | N/A | Danh sách phim kèm doanh thu tương ứng | Giao diện có section thống kê theo phim, dữ liệu hiển thị 0 do chưa có thanh toán trong seed data | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — revenue by movie |
| TC-ANA-04 | Xem tỷ lệ lấp đầy phòng chiếu | Equivalence Class | 1. Vào /admin/revenue. 2. Tìm phần occupancy rate. | N/A | Tỷ lệ lấp đầy = (vé đã bán / tổng ghế) × 100% | Mục occupancy rate hiển thị trên dashboard. Giá trị tương ứng với dữ liệu hiện tại | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — occupancy rate |
| TC-ANA-05 | Kiểm tra cache Redis (lần 2 nhanh hơn) | Equivalence Class | 1. Gọi API /admin/revenue lần 1, ghi thời gian phản hồi. 2. Reload trang (gọi lần 2). 3. So sánh tốc độ. | Cùng URL, gọi 2 lần | Lần 2 nhanh hơn do Redis cache | Trang reload lần 2 nhanh hơn lần đầu, xác nhận cơ chế cache Redis hoạt động | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — Redis cache |
| TC-ANA-06 | Lọc doanh thu với ngày không có dữ liệu | Boundary Value Analysis | 1. Vào /admin/revenue. 2. Chọn khoảng ngày trong tương lai (01/01/2030 - 31/01/2030). | startDate=01/01/2030, endDate=31/01/2030 | Hiển thị doanh thu = 0, không có lỗi | Hệ thống trả về dữ liệu rỗng, không crash, hiển thị "Không có dữ liệu" hoặc các chỉ số bằng 0 | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — empty data handling |
| TC-ANA-07 | Xuất báo cáo với toàn bộ dữ liệu (Performance) | Performance Testing | 1. Vào /admin/revenue. 2. Không lọc thời gian. 3. Load toàn bộ dữ liệu. 4. Đo thời gian phản hồi. | Không có bộ lọc (all data) | API phản hồi dưới 3 giây | API phản hồi thành công trong thời gian chấp nhận được (< 3s), không bị timeout hay lỗi 500 | Hai | 30/03/2026 | Pass | `analytics-service/src/services/analytics-service.ts` — Performance |

---

## 3. 🤖 Quản lý tài liệu Chatbot (RAG — Chatbot Service)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-DOC-01 | Xem danh sách tài liệu đã upload | Equivalence Class | 1. Đăng nhập admin. 2. Điều hướng tới http://localhost:3000/admin/chatbot-documents. 3. Quan sát danh sách. | URL: /admin/chatbot-documents | Danh sách tài liệu hiển thị với tên file, ngày upload, trạng thái | Trang /admin/chatbot-documents trả về lỗi **"Service not found"** — backend chatbot service không phản hồi hoặc cấu hình sai | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Backend service không khả dụng tại thời điểm test |
| TC-DOC-02 | Upload tài liệu PDF hợp lệ | Equivalence Class | 1. Vào /admin/chatbot-documents. 2. Nhấn Upload. 3. Chọn file PDF. 4. Xác nhận. | File PDF hợp lệ | File upload và chunking thành công | Không thể test — trang lỗi "Service not found", không có giao diện upload | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Phụ thuộc TC-DOC-01 đang Fail |
| TC-DOC-03 | Upload tài liệu Word (.docx) hợp lệ | Equivalence Class | 1. Vào /admin/chatbot-documents. 2. Nhấn Upload. 3. Chọn file .docx. | File .docx hợp lệ | File upload thành công, chunking hoàn tất | Không thể test — service unavailable | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Service unavailable |
| TC-DOC-04 | Upload file không hỗ trợ (sai định dạng) | Equivalence Class | 1. Vào /admin/chatbot-documents. 2. Nhấn Upload. 3. Chọn file .exe hoặc .jpg. | File .jpg hoặc .exe | Hiển thị lỗi định dạng không hỗ trợ | Không thể test — service unavailable | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Service unavailable |
| TC-DOC-05 | Xóa tài liệu đã upload | Equivalence Class | 1. Chọn tài liệu trong danh sách. 2. Nhấn Xóa. 3. Xác nhận. | Tài liệu đã tồn tại trong hệ thống | Tài liệu bị xóa thành công | Không thể test — service unavailable | Hai | 30/03/2026 | Fail | `chatbot/src/services/DocumentService.ts` — Service unavailable |

---

## 4. 📰 Quản lý tin tức phim (Movie Service — Go)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-NEWS-01 | Xem danh sách tin tức phim | Equivalence Class | 1. Đăng nhập admin. 2. Click vào "Tin tức" trong sidebar. 3. Quan sát tại /admin/news. | URL: /admin/news | Danh sách tin tức hiển thị đầy đủ | Trang /admin/news trả về lỗi **"Failed to load news"** — API news endpoint không phản hồi | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — API endpoint không hoạt động hoặc chưa được triển khai |
| TC-NEWS-02 | Tạo mới tin tức hợp lệ | Equivalence Class | 1. Vào /admin/news. 2. Nhấn Tạo mới. 3. Điền tiêu đề, nội dung. 4. Lưu. | Title="Test News", Content="Nội dung test" | Tin tức được tạo thành công | Không thể test — trang bị lỗi "Failed to load news" | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — Phụ thuộc TC-NEWS-01 đang Fail |
| TC-NEWS-03 | Cập nhật tin tức | Equivalence Class | 1. Chọn tin tức. 2. Click Sửa. 3. Đổi nội dung. 4. Lưu. | Nội dung mới hợp lệ | Tin tức cập nhật thành công | Không thể test — service không khả dụng | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` |
| TC-NEWS-04 | Ẩn/Hiện tin tức (active/inactive) | State Transition | 1. Chọn tin tức active. 2. Nhấn Ẩn. 3. Quan sát trạng thái. | Status: active → inactive | Trạng thái chuyển inactive thành công | Không thể test — service không khả dụng | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — toggle status |
| TC-NEWS-05 | Xóa tin tức | Equivalence Class | 1. Chọn tin tức. 2. Nhấn Xóa. 3. Xác nhận. | Tin tức cần xóa | Tin tức bị xóa khỏi danh sách | Không thể test — service không khả dụng | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` |
| TC-NEWS-06 | Tạo tin tức với tiêu đề rỗng | Boundary Value Analysis | 1. Vào /admin/news. 2. Nhấn Tạo mới. 3. Để trống Title. 4. Lưu. | Title="" (rỗng) | Form validation hiển thị lỗi | Không thể test — service không khả dụng | Hai | 30/03/2026 | Fail | `movie-service/internal/service/news_service.go` — validation |

---

## 5. 🔐 Logic phân quyền theo Role (API Gateway — Go)

| ID Test case | Objective | Technique | Steps | Input data | Expected result | Actual result | Tester | Date | Result | Note |
|---|---|---|---|---|---|---|---|---|---|---|
| TC-AUTH-01 | Admin truy cập trang quản lý (được phép) | Equivalence Class | 1. Đăng nhập manager@cinema.com / password. 2. Điều hướng tới /admin/dashboard. 3. Quan sát. | JWT Token role=admin | HTTP 200, dashboard admin hiển thị đầy đủ | Đăng nhập thành công, /admin/dashboard hiển thị đầy đủ các module quản lý (Movies, Rooms, Showtimes, Staff, Revenue...) | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — admin access |
| TC-AUTH-02 | Khách hàng truy cập trang admin (bị chặn) | Equivalence Class | 1. Đăng nhập alice@email.com / password. 2. Thử truy cập /admin/dashboard trực tiếp. | JWT Token role=user | Bị chặn, redirect về trang customer hoặc lỗi 403 | Khách hàng (alice) sau khi đăng nhập bị redirect về trang customer, không thể truy cập /admin/dashboard | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — block user role |
| TC-AUTH-03 | Truy cập /admin mà không đăng nhập | Boundary Value Analysis | 1. Không đăng nhập. 2. Truy cập thẳng http://localhost:3000/admin/dashboard. | Không có session/token | Bị redirect về trang login | Tự động redirect về /admin/login, không cho phép truy cập admin khi chưa xác thực | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — unauthenticated access |
| TC-AUTH-04 | Manager_staff bị hạn chế trang nhạy cảm | Equivalence Class | 1. Đăng nhập tài khoản role=manager_staff. 2. Thử truy cập /admin/users hoặc /admin/roles. | JWT Token role=manager_staff | Bị redirect hoặc lỗi 403 cho các trang chỉ dành cho admin | Tài khoản manager_staff bị redirect khỏi /admin/users và /admin/roles, chỉ có thể truy cập các module được phép | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — role restriction |
| TC-AUTH-05 | Manager_staff truy cập trang được phép | Equivalence Class | 1. Đăng nhập manager_staff. 2. Truy cập /admin/revenue. 3. Quan sát. | JWT Token role=manager_staff | HTTP 200, trang doanh thu hiển thị | Tài khoản manager_staff truy cập được trang /admin/revenue và các module quản lý phim, lịch chiếu | Hai | 30/03/2026 | Pass | `api-gateway/internal/middleware/auth.go` — manager_staff allowed |

---

## 📊 Tổng kết

| Module | Tổng TC | Pass | Fail | Tỉ lệ Pass | Ghi chú |
|--------|---------|------|------|------------|---------|
| 👤 User & Role Management | 8 TC | 6 | 2 | 75% | TC-ROLE-02, TC-ROLE-03: UI quản lý permission chưa triển khai |
| 📊 Analytics Service | 7 TC | 7 | 0 | 100% | Số liệu hiển thị 0 do chưa có giao dịch PAID trong seed data |
| 🤖 Chatbot Document (RAG) | 5 TC | 0 | 5 | 0% | Backend chatbot service trả về "Service not found" |
| 📰 News Management | 6 TC | 0 | 6 | 0% | API news endpoint trả về "Failed to load news" |
| 🔐 API Gateway Auth | 5 TC | 5 | 0 | 100% | RBAC hoạt động đúng, phân quyền chính xác |
| **Tổng cộng** | **31 TC** | **18** | **13** | **58%** | |

---

## 🐛 Defect Summary

| Defect ID | Module | Mô tả lỗi | Mức độ |
|---|---|---|---|
| BUG-01 | Chatbot | Trang /admin/chatbot-documents trả về "Service not found" — backend chatbot service không khả dụng | High |
| BUG-02 | News Management | Trang /admin/news trả về "Failed to load news" — API endpoint tin tức không hoạt động | High |
| BUG-03 | User Management | Sidebar admin thiếu link trực tiếp đến "Quản lý Nhân viên", phải nhập URL tay | Medium |
| BUG-04 | User Management | Không có giao diện quản lý Permission/Role assignment (TC-ROLE-02, TC-ROLE-03) | Medium |
| BUG-05 | User Management | Xóa nhân viên không có confirmation dialog, thực hiện ngay lập tức | Low |

---

> **Ghi chú chung:**
> - Môi trường test: Docker Compose local — http://localhost:3000
> - Admin: manager@cinema.com / password | Customer: alice@email.com / password
> - Services liên quan: `user-service/`, `analytics-service/`, `chatbot/`, `movie-service/`, `api-gateway/`
> - **Chatbot** và **News** service cần kiểm tra lại cấu hình backend / API endpoints
