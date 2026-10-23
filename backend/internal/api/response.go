package api

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"calculator/internal/calculator"
)

// Error codes are stable, machine-readable identifiers clients can switch on.
// Messages are human-readable and may change.
const (
	CodeInvalidJSON      = "invalid_json"
	CodeInvalidInput     = "invalid_input"
	CodeDivisionByZero   = "division_by_zero"
	CodeNegativeSqrt     = "negative_sqrt"
	CodeUndefinedResult  = "undefined_result"
	CodeOverflow         = "overflow"
	CodeNotFound         = "not_found"
	CodeMethodNotAllowed = "method_not_allowed"
	CodeInternal         = "internal_error"
)

// ResultResponse is the body of a successful calculation.
type ResultResponse struct {
	Operation string  `json:"operation"`
	Result    float64 `json:"result"`
}

// ErrorResponse is the body of every non-2xx response.
type ErrorResponse struct {
	Error ErrorDetail `json:"error"`
}

// ErrorDetail describes what went wrong.
type ErrorDetail struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("failed to encode response", "err", err)
	}
}

func writeError(w http.ResponseWriter, status int, code, message string) {
	writeJSON(w, status, ErrorResponse{Error: ErrorDetail{Code: code, Message: message}})
}

// writeCalculationError maps a domain error to an HTTP response.
//
// Domain errors are 422: the request was well-formed, but the values cannot
// produce a real, finite result.
func writeCalculationError(w http.ResponseWriter, err error) {
	var code string
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero):
		code = CodeDivisionByZero
	case errors.Is(err, calculator.ErrNegativeSqrt):
		code = CodeNegativeSqrt
	case errors.Is(err, calculator.ErrUndefined):
		code = CodeUndefinedResult
	case errors.Is(err, calculator.ErrOverflow):
		code = CodeOverflow
	case errors.Is(err, calculator.ErrInvalidOperand):
		code = CodeInvalidInput
	default:
		slog.Error("unexpected calculation error", "err", err)
		writeError(w, http.StatusInternalServerError, CodeInternal, "internal server error")
		return
	}
	writeError(w, http.StatusUnprocessableEntity, code, err.Error())
}
