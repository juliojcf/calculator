.PHONY: run build test cover lint docker

run:
	go run ./cmd/server

build:
	go build -o bin/server ./cmd/server

test:
	go test -race ./...

# Writes coverage.out and an HTML report (coverage.html).
cover:
	go test -race -coverprofile=coverage.out ./internal/...
	go tool cover -func=coverage.out
	go tool cover -html=coverage.out -o coverage.html

lint:
	gofmt -l . | (! grep .) || (echo "run gofmt -w ." && exit 1)
	go vet ./...

docker:
	docker build -t calculator-backend .
