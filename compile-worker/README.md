# Compile Worker

Minimal HTTP compile worker that accepts POST /compile and runs code for several languages.

Environment
- `PORT` (default 3001)
- `COMPILE_WORKER_KEY` (optional) — if set, requests must include `x-api-key` header

API
- POST /compile
  - JSON body: { language: "cpp" | "c" | "java" | "python" | "javascript", code: string, input?: string }
  - Returns JSON: { success: true, run: { stdout, stderr } } on success.

Quick local test

Install deps and run locally:

```bash
cd compile-worker
npm install
node index.js
```

Docker build/run:

```bash
docker build -t compile-worker:latest .
docker run -p 3001:3001 -e COMPILE_WORKER_KEY=secret compile-worker:latest
```

Then POST to http://localhost:3001/compile with JSON.
