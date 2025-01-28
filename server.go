package main

import (
	"compress/gzip"
	"io"
	"net/http"
	"path"
	"strings"
	"time"
)

func main() {
	// Configure production-ready HTTP server
	server := &http.Server{
		Addr:         ":8080",
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
		Handler:      gzipMiddleware(handleRoutes()),
	}

	println("Production server running on http://localhost:8080")
	if err := server.ListenAndServe(); err != nil {
		panic(err.Error())
	}
}

func handleRoutes() http.Handler {
	mux := http.NewServeMux()

	// Serve static files with proper caching headers
	fs := http.FileServer(neuterFileSystem{http.Dir(".")})
	mux.Handle("/", cacheControlMiddleware(fs))

	return mux
}

// Gzip compression middleware
func gzipMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.Contains(r.Header.Get("Accept-Encoding"), "gzip") {
			w.Header().Set("Content-Encoding", "gzip")
			gz := gzip.NewWriter(w)
			defer gz.Close()
			next.ServeHTTP(gzipResponseWriter{Writer: gz, ResponseWriter: w}, r)
		} else {
			next.ServeHTTP(w, r)
		}
	})
}

// Cache control middleware for static assets
func cacheControlMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if path.Ext(r.URL.Path) == "" {
			w.Header().Set("Cache-Control", "no-cache")
		} else {
			w.Header().Set("Cache-Control", "public, max-age=86400") // 24h cache
		}
		next.ServeHTTP(w, r)
	})
}

// Custom response writer for gzip
type gzipResponseWriter struct {
	io.Writer
	http.ResponseWriter
}

func (g gzipResponseWriter) Write(b []byte) (int, error) {
	return g.Writer.Write(b)
}

// Prevent directory listing
type neuterFileSystem struct {
	fs http.FileSystem
}

func (nfs neuterFileSystem) Open(path string) (http.File, error) {
	f, err := nfs.fs.Open(path)
	if err != nil {
		return nil, err
	}

	s, err := f.Stat()
	if s.IsDir() {
		index := strings.TrimSuffix(path, "/") + "/index.html"
		if _, err := nfs.fs.Open(index); err != nil {
			return nil, err
		}
	}

	return f, nil
}
