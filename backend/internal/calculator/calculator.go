package calculator

import (
	"errors"
	"math"
)

var (
	ErrDivisionByZero = errors.New("division by zero")
	ErrNegativeSqrt   = errors.New("square root of a negative number is not a real number")
	ErrUndefined      = errors.New("result is undefined")
	ErrOverflow       = errors.New("result is out of range")
	ErrInvalidOperand = errors.New("operands must be finite numbers")
)

// Add returns a + b.
func Add(a, b float64) (float64, error) {
	return checked(a+b, a, b)
}

// Subtract returns a - b.
func Subtract(a, b float64) (float64, error) {
	return checked(a-b, a, b)
}

// Multiply returns a * b.
func Multiply(a, b float64) (float64, error) {
	return checked(a*b, a, b)
}

// Divide returns a / b, or ErrDivisionByZero when b is zero.
func Divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return checked(a/b, a, b)
}

// Power returns a raised to the power b.
//
// Cases with no real result (e.g. (-8)^0.5) return ErrUndefined, and cases
// that diverge (e.g. 0^-1, 10^400) return ErrOverflow.
func Power(a, b float64) (float64, error) {
	return checked(math.Pow(a, b), a, b)
}

// Sqrt returns the square root of a, or ErrNegativeSqrt when a < 0.
func Sqrt(a float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return checked(math.Sqrt(a), a)
}

// Percentage returns a percent of b, i.e. (a / 100) * b.
// For example, Percentage(20, 50) is 10.
func Percentage(a, b float64) (float64, error) {
	return checked(a/100*b, a, b)
}

// checked validates the operands and the result of an operation, translating
// IEEE-754 special values into domain errors.
func checked(result float64, operands ...float64) (float64, error) {
	for _, op := range operands {
		if math.IsNaN(op) || math.IsInf(op, 0) {
			return 0, ErrInvalidOperand
		}
	}
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefined
	case math.IsInf(result, 0):
		return 0, ErrOverflow
	}
	// Normalize -0 to 0 so clients never see "-0" in a response.
	if result == 0 {
		return 0, nil
	}
	return result, nil
}
