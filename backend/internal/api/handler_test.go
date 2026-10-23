package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

const testOrigin = "http://localhost:5173"

func newTestServer(t *testing.T) http.Handler {
	t.Helper()
	return NewRouter([]string{testOrigin})
}

func do(t *testing.T, h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestOperationsSuccess(t *testing.T) {
	tests := []struct {
		path string
		body string
		want float64
	}{
		{"/api/v1/add", `{"a": 2, "b": 3}`, 5},
		{"/api/v1/subtract", `{"a": 2, "b": 3}`, -1},
		{"/api/v1/multiply", `{"a": 2.5, "b": 4}`, 10},
		{"/api/v1/divide", `{"a": 7, "b": 2}`, 3.5},
		{"/api/v1/power", `{"a": 2, "b": 8}`, 256},
		{"/api/v1/percentage", `{"a": 15, "b": 200}`, 30},
		{"/api/v1/sqrt", `{"a": 81}`, 9},
		{"/api/v1/add", `{"a": 0, "b": 0}`, 0},
	}

	h := newTestServer(t)
	for _, tt := range tests {
		t.Run(tt.path, func(t *testing.T) {
			rec := do(t, h, http.MethodPost, tt.path, tt.body)

			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body: %s", rec.Code, rec.Body)
			}
			if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
				t.Errorf("Content-Type = %q, want application/json", ct)
			}
			var resp ResultResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
				t.Fatalf("invalid JSON response: %v", err)
			}
			wantOp := strings.TrimPrefix(tt.path, "/api/v1/")
			if resp.Operation != wantOp {
				t.Errorf("operation = %q, want %q", resp.Operation, wantOp)
			}
			if resp.Result != tt.want {
				t.Errorf("result = %v, want %v", resp.Result, tt.want)
			}
		})
	}
}

func TestOperationsErrors(t *testing.T) {
	tests := []struct {
		name       string
		method     string
		path       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{"division by zero", "POST", "/api/v1/divide", `{"a": 1, "b": 0}`, 422, CodeDivisionByZero},
		{"negative sqrt", "POST", "/api/v1/sqrt", `{"a": -1}`, 422, CodeNegativeSqrt},
		{"undefined power", "POST", "/api/v1/power", `{"a": -8, "b": 0.5}`, 422, CodeUndefinedResult},
		{"overflow", "POST", "/api/v1/multiply", `{"a": 1e308, "b": 10}`, 422, CodeOverflow},

		{"empty body", "POST", "/api/v1/add", ``, 400, CodeInvalidJSON},
		{"malformed JSON", "POST", "/api/v1/add", `{"a": 1,`, 400, CodeInvalidJSON},
		{"syntax error", "POST", "/api/v1/add", `{"a": 1 "b": 2}`, 400, CodeInvalidJSON},
		{"missing b", "POST", "/api/v1/add", `{"a": 1}`, 400, CodeInvalidInput},
		{"missing a in sqrt", "POST", "/api/v1/sqrt", `{}`, 400, CodeInvalidInput},
		{"malformed JSON in sqrt", "POST", "/api/v1/sqrt", `{"a": `, 400, CodeInvalidJSON},
		{"null operand", "POST", "/api/v1/add", `{"a": null, "b": 2}`, 400, CodeInvalidInput},
		{"string operand", "POST", "/api/v1/add", `{"a": "1", "b": 2}`, 400, CodeInvalidInput},
		{"array body", "POST", "/api/v1/add", `[1, 2]`, 400, CodeInvalidInput},
		{"number out of range", "POST", "/api/v1/add", `{"a": 1e400, "b": 1}`, 400, CodeInvalidInput},
		{"unknown field", "POST", "/api/v1/add", `{"a": 1, "b": 2, "c": 3}`, 400, CodeInvalidJSON},
		{"trailing data", "POST", "/api/v1/add", `{"a": 1, "b": 2}{}`, 400, CodeInvalidJSON},
		{"body too large", "POST", "/api/v1/add", `{"a": 1, "b": 2` + strings.Repeat(" ", 2048) + `}`, 400, CodeInvalidJSON},

		{"wrong method", "GET", "/api/v1/add", ``, 405, CodeMethodNotAllowed},
		{"unknown route", "POST", "/api/v1/modulo", `{"a": 1, "b": 2}`, 404, CodeNotFound},
	}

	h := newTestServer(t)
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec := do(t, h, tt.method, tt.path, tt.body)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d; body: %s", rec.Code, tt.wantStatus, rec.Body)
			}
			var resp ErrorResponse
			if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
				t.Fatalf("invalid JSON response: %v; body: %s", err, rec.Body)
			}
			if resp.Error.Code != tt.wantCode {
				t.Errorf("code = %q, want %q", resp.Error.Code, tt.wantCode)
			}
			if resp.Error.Message == "" {
				t.Error("error message is empty")
			}
		})
	}
}

func TestMethodNotAllowedSetsAllowHeader(t *testing.T) {
	rec := do(t, newTestServer(t), http.MethodGet, "/api/v1/divide", "")
	if got := rec.Header().Get("Allow"); got != http.MethodPost {
		t.Errorf("Allow = %q, want POST", got)
	}
}

func TestHealthz(t *testing.T) {
	rec := do(t, newTestServer(t), http.MethodGet, "/healthz", "")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if body := strings.TrimSpace(rec.Body.String()); body != `{"status":"ok"}` {
		t.Errorf("body = %s", body)
	}
}
