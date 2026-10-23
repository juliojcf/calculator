// Command server runs the calculator REST API.
//
// Configuration is read from the environment:
//
//	PORT             port to listen on (default 8080)
//	ALLOWED_ORIGINS  comma-separated CORS origins, or "*" (default http://localhost:5173)
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"calculator/internal/api"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, nil)))

	if err := run(); err != nil {
		slog.Error("server stopped with error", "err", err)
		os.Exit(1)
	}
}

func run() error {
	addr := ":" + getenv("PORT", "8080")
	origins := strings.Split(getenv("ALLOWED_ORIGINS", "http://localhost:5173"), ",")
	for i := range origins {
		origins[i] = strings.TrimSpace(origins[i])
	}

	srv := &http.Server{
		Addr:              addr,
		Handler:           api.NewRouter(origins),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	errCh := make(chan error, 1)
	go func() {
		slog.Info("listening", "addr", addr, "allowed_origins", origins)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		return err
	case <-ctx.Done():
	}

	slog.Info("shutting down")
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		return err
	}
	if err := <-errCh; !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
