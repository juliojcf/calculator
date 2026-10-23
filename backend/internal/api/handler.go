package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"calculator/internal/calculator"
)

// maxBodyBytes caps request bodies; a calculation never needs more.
const maxBodyBytes = 1 << 10

// binaryRequest is the body for operations that take two operands.
// Pointers distinguish a missing field from an explicit zero.
type binaryRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

// unaryRequest is the body for operations that take one operand.
type unaryRequest struct {
	A *float64 `json:"a"`
}

type (
	binaryFunc func(a, b float64) (float64, error)
	unaryFunc  func(a float64) (float64, error)
)

// NewRouter returns the HTTP handler with every route registered and the
// standard middleware chain applied.
func NewRouter(allowedOrigins []string) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	binaryOps := map[string]binaryFunc{
		"add":        calculator.Add,
		"subtract":   calculator.Subtract,
		"multiply":   calculator.Multiply,
		"divide":     calculator.Divide,
		"power":      calculator.Power,
		"percentage": calculator.Percentage,
	}
	for name, fn := range binaryOps {
		handlePost(mux, "/api/v1/"+name, binaryHandler(name, fn))
	}
	handlePost(mux, "/api/v1/sqrt", unaryHandler("sqrt", calculator.Sqrt))

	// Catch-all so unknown routes get a JSON error instead of plain text.
	mux.HandleFunc("/", func(w http.ResponseWriter, _ *http.Request) {
		writeError(w, http.StatusNotFound, CodeNotFound, "route not found")
	})

	return chain(mux, recoverer, logger, cors(allowedOrigins))
}

// handlePost registers h for POST requests on path, and answers any other
// method with a JSON 405 (the catch-all route would otherwise turn it into 404).
func handlePost(mux *http.ServeMux, path string, h http.Handler) {
	mux.Handle("POST "+path, h)
	mux.HandleFunc(path, func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Allow", http.MethodPost)
		writeError(w, http.StatusMethodNotAllowed, CodeMethodNotAllowed, "only POST is allowed on this route")
	})
}

func binaryHandler(name string, fn binaryFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req binaryRequest
		if !decode(w, r, &req) {
			return
		}
		if req.A == nil || req.B == nil {
			writeError(w, http.StatusBadRequest, CodeInvalidInput, `fields "a" and "b" are required`)
			return
		}
		result, err := fn(*req.A, *req.B)
		if err != nil {
			writeCalculationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, ResultResponse{Operation: name, Result: result})
	})
}

func unaryHandler(name string, fn unaryFunc) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req unaryRequest
		if !decode(w, r, &req) {
			return
		}
		if req.A == nil {
			writeError(w, http.StatusBadRequest, CodeInvalidInput, `field "a" is required`)
			return
		}
		result, err := fn(*req.A)
		if err != nil {
			writeCalculationError(w, err)
			return
		}
		writeJSON(w, http.StatusOK, ResultResponse{Operation: name, Result: result})
	})
}

// decode strictly parses a single JSON object from the request body into dst.
// On failure it writes a 400 response and returns false.
func decode(w http.ResponseWriter, r *http.Request, dst any) bool {
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxBodyBytes))
	dec.DisallowUnknownFields()

	if err := dec.Decode(dst); err != nil {
		writeError(w, http.StatusBadRequest, decodeErrorCode(err), decodeErrorMessage(err))
		return false
	}
	if err := dec.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		writeError(w, http.StatusBadRequest, CodeInvalidJSON, "request body must contain a single JSON object")
		return false
	}
	return true
}

func decodeErrorCode(err error) string {
	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		return CodeInvalidInput
	}
	return CodeInvalidJSON
}

func decodeErrorMessage(err error) string {
	var (
		syntaxErr *json.SyntaxError
		typeErr   *json.UnmarshalTypeError
		maxErr    *http.MaxBytesError
	)
	switch {
	case errors.Is(err, io.EOF):
		return "request body must not be empty"
	case errors.As(err, &syntaxErr):
		return fmt.Sprintf("malformed JSON at position %d", syntaxErr.Offset)
	case errors.As(err, &typeErr) && strings.HasPrefix(typeErr.Value, "number"):
		return fmt.Sprintf("field %q is out of the supported numeric range", typeErr.Field)
	case errors.As(err, &typeErr):
		if typeErr.Field != "" {
			return fmt.Sprintf("field %q must be a number", typeErr.Field)
		}
		return "request body must be a JSON object"
	case errors.As(err, &maxErr):
		return fmt.Sprintf("request body must not exceed %d bytes", maxErr.Limit)
	default:
		// Covers unknown fields and truncated bodies; the decoder's message
		// is already descriptive.
		return err.Error()
	}
}
