package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"api-gateway/internal/config"
	"api-gateway/internal/pkg/auth"
	"api-gateway/internal/pkg/logger"

	"github.com/gin-gonic/gin"
)

// mockLogger is a simple implementation of logger.Logger for testing
type mockLogger struct{}

func (m *mockLogger) Debug(msg string, keysAndValues ...interface{}) {}
func (m *mockLogger) Info(msg string, keysAndValues ...interface{})  {}
func (m *mockLogger) Warn(msg string, keysAndValues ...interface{})  {}
func (m *mockLogger) Error(msg string, keysAndValues ...interface{}) {}
func (m *mockLogger) Fatal(msg string, keysAndValues ...interface{}) {}
func (m *mockLogger) With(keysAndValues ...interface{}) logger.Logger { return m }

func setupTestRouter(authMiddleware *AuthMiddleware) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(authMiddleware.Authenticate())
	r.GET("/api/v1/analytics/revenue/total", func(c *gin.Context) {
		c.Status(http.StatusOK)
	})
	return r
}

func TestAuthMiddleware_RoleBasedAccessControl(t *testing.T) {
	// [TC-GATEWAY-01] Test Objective: Role-based access control (RBAC) - Block normal employees from accessing revenue reports
	
	cfg := &config.Config{
		Auth: struct {
			JWTSecret     string   `mapstructure:"jwt_secret"`
			TokenExp      int      `mapstructure:"token_expiration"`
			PublicPaths   []string `mapstructure:"public_paths"`
			AdminPaths    []string `mapstructure:"admin_paths"`
		}{
			JWTSecret:  "test-secret",
			TokenExp:   3600,
			AdminPaths: []string{"/api/v1/analytics/*"},
		},
	}
	jwtManager := auth.NewJWTManager("test-secret", time.Hour)
	authMiddleware := NewAuthMiddleware(jwtManager, cfg, &mockLogger{})
	
	router := setupTestRouter(authMiddleware)

	tests := []struct {
		name           string
		role           string
		expectedStatus int
		description    string
	}{
		{
			name:           "Admin Access (Allowed)",
			role:           "admin",
			expectedStatus: http.StatusOK,
			description:    "Admin should have access to revenue reports",
		},
		{
			name:           "Manager Staff Access (Allowed)",
			role:           "manager_staff",
			expectedStatus: http.StatusOK,
			description:    "Manager staff should have access to revenue reports",
		},
		{
			name:           "Normal Employee Access (Blocked)",
			role:           "user",
			expectedStatus: http.StatusForbidden,
			description:    "Normal user (employee) should be blocked from revenue reports",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// Generate token for the specific role
			token, err := jwtManager.GenerateToken("user123", "test@test.com", tt.role)
			if err != nil {
				t.Fatalf("Failed to generate token: %v", err)
			}

			// Create request
			req, _ := http.NewRequest("GET", "/api/v1/analytics/revenue/total", nil)
			req.Header.Set("Authorization", "Bearer "+token)

			// Execute request
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			// Assert outcome
			if w.Code != tt.expectedStatus {
				t.Errorf("Expected status %d, got %d for role %s", tt.expectedStatus, w.Code, tt.role)
			}
		})
	}
}
