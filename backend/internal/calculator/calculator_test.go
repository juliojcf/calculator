package calculator

import (
	"errors"
	"math"
	"testing"
)

func TestBinaryOperations(t *testing.T) {
	tests := []struct {
		name    string
		fn      func(a, b float64) (float64, error)
		a, b    float64
		want    float64
		wantErr error
	}{
		{"add integers", Add, 2, 3, 5, nil},
		{"add negatives", Add, -2, -3, -5, nil},
		{"add decimals", Add, 1.5, 2.25, 3.75, nil},
		{"add overflow", Add, math.MaxFloat64, math.MaxFloat64, 0, ErrOverflow},

		{"subtract", Subtract, 10, 4, 6, nil},
		{"subtract to negative", Subtract, 4, 10, -6, nil},
		{"subtract to zero normalizes sign", Subtract, -0.0, 0, 0, nil},

		{"multiply", Multiply, 6, 7, 42, nil},
		{"multiply by zero", Multiply, -5, 0, 0, nil},
		{"multiply overflow", Multiply, math.MaxFloat64, 2, 0, ErrOverflow},

		{"divide", Divide, 10, 4, 2.5, nil},
		{"divide negative", Divide, -9, 3, -3, nil},
		{"divide by zero", Divide, 1, 0, 0, ErrDivisionByZero},
		{"divide zero by zero", Divide, 0, 0, 0, ErrDivisionByZero},
		{"divide overflow", Divide, math.MaxFloat64, 0.5, 0, ErrOverflow},

		{"power", Power, 2, 10, 1024, nil},
		{"power zero exponent", Power, 5, 0, 1, nil},
		{"power negative exponent", Power, 2, -2, 0.25, nil},
		{"power fractional exponent", Power, 9, 0.5, 3, nil},
		{"power negative base odd integer", Power, -2, 3, -8, nil},
		{"power negative base fractional", Power, -8, 0.5, 0, ErrUndefined},
		{"power zero to negative", Power, 0, -1, 0, ErrOverflow},
		{"power overflow", Power, 10, 400, 0, ErrOverflow},

		{"percentage", Percentage, 20, 50, 10, nil},
		{"percentage over 100", Percentage, 150, 40, 60, nil},
		{"percentage of zero", Percentage, 30, 0, 0, nil},

		{"NaN operand", Add, math.NaN(), 1, 0, ErrInvalidOperand},
		{"Inf operand", Multiply, 1, math.Inf(1), 0, ErrInvalidOperand},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := tt.fn(tt.a, tt.b)
			assertResult(t, got, err, tt.want, tt.wantErr)
		})
	}
}

func TestSqrt(t *testing.T) {
	tests := []struct {
		name    string
		a       float64
		want    float64
		wantErr error
	}{
		{"perfect square", 16, 4, nil},
		{"non-perfect square", 2, math.Sqrt2, nil},
		{"zero", 0, 0, nil},
		{"negative", -4, 0, ErrNegativeSqrt},
		{"infinite operand", math.Inf(1), 0, ErrInvalidOperand},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := Sqrt(tt.a)
			assertResult(t, got, err, tt.want, tt.wantErr)
		})
	}
}

func assertResult(t *testing.T, got float64, err error, want float64, wantErr error) {
	t.Helper()
	if wantErr != nil {
		if !errors.Is(err, wantErr) {
			t.Fatalf("error = %v, want %v", err, wantErr)
		}
		return
	}
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got != want {
		t.Fatalf("result = %v, want %v", got, want)
	}
	if math.Signbit(got) && got == 0 {
		t.Fatalf("result is negative zero")
	}
}
