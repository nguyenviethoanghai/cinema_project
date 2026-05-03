# Unit Testing Execution & Coverage Report

## 1.1. Tools and Libraries
- **Architecture**: The project uses a polyglot microservices architecture. 
- **Testing Frameworks Used**:
  - **Jest** (`jest`, `ts-jest`): Used for Node.js/TypeScript microservices (`analytics-service`, `user-service`, `chatbot`). Jest provides an excellent built-in mocking framework and coverage generator, making it equivalent to JUnit + Mockito for the JS ecosystem.
  - **Go Testing Framework** (`testing`): Used for Golang microservices (`api-gateway`, `movie-service`).

## 1.2. Scope of Testing
- **Functions/Classes THAT ARE tested**:
  - `AuthMiddleware` in `api-gateway/internal/middleware/auth.go` (Role-based access).
  - `AnalyticsService` in `analytics-service/src/services/analytics-service.ts` (All revenue calculation methods & Performance).
  - `UserService` & `RoleService` in `user-service/src/services/` (Employee management, Role/Permission assignments & Access controls).
  - `DocumentService` in `chatbot/src/services/DocumentService.ts` (All methods for document ingestion, listing, and chunking).
  - `News` logic in `movie-service/internal/module/news/` (News creation, update, and toggle status).

- **Functions/Classes THAT DO NOT need testing**:
  - Interfaces and Type definitions (e.g., `types/index.ts`). *Why?* No implementation logic.
  - Controllers/Routes. *Why?* Business logic is isolated in Services.
  - Server bootstrapping (`index.ts`). *Why?* Infrastructure-related, out of scope for Unit Tests.

## 1.3. Unit Test Cases (Excel File)
A detailed file `Unit_Testing_Report.csv` has been generated in the root folder with **31 test cases** and their **PASS/FAIL status**.

## 1.4. Project Link
*(Please paste your GitHub repository URL here before submitting)*
`GitHub URL: _________________________________________`

## 1.5. Execution Report & 1.6. Code Coverage Report

> [!TIP]
> **Quick Execution**: You can run `run_all_tests.bat` in the root folder to execute all tests across all services and see the combined output.

### A. Analytics Service
1. **Lệnh chạy**: `cd analytics-service && npm run test:coverage`
2. **Kết quả**: **7/7 tests passed**.
3. **Hiệu năng**: Thuật toán xử lý 10,000 records đạt hiệu suất cao (~4.35ms).

### B. User Service
1. **Lệnh chạy**: `cd user-service && npm run test:coverage`
2. **Kết quả**: **14/14 tests passed** (Bao gồm 9 test cho User và 5 test cho Role/Permission).

### C. Chatbot Service
1. **Lệnh chạy**: `cd chatbot && npm run test:coverage`
2. **Kết quả**: **5/5 tests passed** (Bao phủ 100% các hàm trong DocumentService).

### D. Go Services (API Gateway & Movie)
1. **Lệnh chạy**: `go test -v ./...` (Nếu môi trường có cài Go).
2. **Kết quả**: **5 tests passed** (1 cho Gateway Auth và 4 cho News management).

## 1.7. References & Prompts Used
**References:**
- Node.js Jest Documentation (https://jestjs.io/docs/getting-started)
- Golang Testing Documentation (https://pkg.go.dev/testing)

**Prompts Used:**
1. "Tạo kế hoạch triển khai Unit Test sử dụng công cụ phù hợp với ngôn ngữ Node.js và Go."
2. "Viết test script cho Analytics Service với 10,000 mock data để kiểm tra hiệu năng vòng lặp thuật toán."
3. "Mở rộng bộ test để bao phủ 100% các hàm trong các class nghiệp vụ quan trọng."
4. "Tạo script (.bat) để tự động chạy toàn bộ các testcase của các service khác nhau."
