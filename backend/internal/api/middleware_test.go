package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORS(t *testing.T) {
	tests := []struct {
		name       string
		allowed    []string
		origin     string
		wantHeader string
	}{
		{"allowed origin", []string{testOrigin}, testOrigin, testOrigin},
		{"disallowed origin", []string{testOrigin}, "http://evil.example", ""},
		{"wildcard", []string{"*"}, "http://any.example", "http://any.example"},
		{"no origin header", []string{testOrigin}, "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewRouter(tt.allowed)
			req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)

			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != tt.wantHeader {
				t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, tt.wantHeader)
			}
		})
	}
}

func TestCORSPreflight(t *testing.T) {
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/add", nil)
	req.Header.Set("Origin", testOrigin)
	req.Header.Set("Access-Control-Request-Method", http.MethodPost)
	rec := httptest.NewRecorder()
	NewRouter([]string{testOrigin}).ServeHTTP(rec, req)

	if rec.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want 204", rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Methods"); got == "" {
		t.Error("Access-Control-Allow-Methods not set")
	}
}

func TestRecovererReturnsJSON500(t *testing.T) {
	panicking := http.HandlerFunc(func(http.ResponseWriter, *http.Request) { panic("boom") })
	rec := httptest.NewRecorder()
	recoverer(panicking).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/", nil))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
}

func TestChainOrder(t *testing.T) {
	var order []string
	mw := func(name string) middleware {
		return func(next http.Handler) http.Handler {
			return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				order = append(order, name)
				next.ServeHTTP(w, r)
			})
		}
	}
	h := chain(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {}), mw("first"), mw("second"))
	h.ServeHTTP(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/", nil))

	if len(order) != 2 || order[0] != "first" || order[1] != "second" {
		t.Errorf("order = %v, want [first second]", order)
	}
}
