# Judge0 CE API Setup Guide

CodeSphere uses **Judge0 Community Edition** for secure, sandboxed code compilation and execution.

There are two options:
1. **Public Free API** (recommended for production) — no setup needed
2. **Self-hosted** (optional for local development) — full control, unlimited

---

## Quick Start (Recommended: Public API)

### Option 1: Use Public Judge0 CE API (No Setup)

**This is the recommended approach — completely free, no configuration needed.**

#### Step 1: Update Backend Environment Variables

In `backend/.env`, set:
```bash
JUDGE0_HOST=https://ce.judge0.com
```

That's it! No other setup required.

#### Step 2: Restart Backend

```bash
cd backend
npm start
```

#### Step 3: Test

```bash
# Test status endpoint
curl http://localhost:3000/code/status

# Should see: "platform": "Judge0 CE (Self-Hosted)"
```

---

## Option 2: Local Self-Hosted Judge0 (Development)

If you want unlimited local development without rate limits:

### Prerequisites
- Docker Desktop installed

### Step 1: Start Judge0 Locally

```bash
docker run -p 2358:2358 judge0/judge0:latest
```

First run takes 1-2 minutes (database initialization).

### Step 2: Configure Backend

In `backend/.env`, set:
```bash
JUDGE0_HOST=http://localhost:2358
```

### Step 3: Restart Backend

```bash
cd backend
npm start
```

### Step 4: Test

```bash
curl http://localhost:2358/languages
# Should return list of 60+ languages
```

---

## Deployment on Render

**No additional setup needed!** Your Render backend will automatically use the public API.

### Step 1: Deploy CodeSphere Backend

In Render dashboard, set environment variable:
```bash
JUDGE0_HOST=https://ce.judge0.com
```

### Step 2: Redeploy

Push changes or click "Redeploy" in Render dashboard.

### Step 3: Verify

```bash
curl https://your-codesphere-backend.onrender.com/code/status
```

Should return:
```json
{
  "success": true,
  "platform": "Judge0 CE (Self-Hosted)",
  "supported": {
    "c": true,
    "cpp": true,
    "python": true,
    ...
  }
}
```

---

## Supported Languages

| Language | Judge0 ID | Status |
|---|---|---|
| C | 50 | ✅ |
| C++ | 54 | ✅ |
| Python 3 | 71 | ✅ |
| Java | 62 | ✅ |
| JavaScript | 63 | ✅ |
| Go | 60 | ✅ |
| Rust | 73 | ✅ |
| TypeScript | 74 | ✅ |
| Kotlin | 48 | ✅ |

Judge0 supports 60+ additional languages. Query available:
```bash
curl https://ce.judge0.com/languages
```

---

## Public API Rate Limits

**Judge0 Public Free API:**
- ~100 submissions per day (generous for dev/testing)
- 1-2 second execution time
- No API key needed

For higher limits or production use:
- Run self-hosted Judge0 locally or on your server
- Or upgrade to Judge0 Premium (optional)

---

## Testing

### Test Compilation (Public API)

```bash
# Python
curl -X POST http://localhost:3000/code/compile \
  -H "Content-Type: application/json" \
  -d '{"code":"print(123)","language":"python","input":""}'

# C++
curl -X POST http://localhost:3000/code/compile \
  -H "Content-Type: application/json" \
  -d '{"code":"#include<iostream>\nint main(){std::cout<<\"hi\";}","language":"cpp","input":""}'

# Java
curl -X POST http://localhost:3000/code/compile \
  -H "Content-Type: application/json" \
  -d '{"code":"public class Main{public static void main(String[] a){System.out.println(\"hi\");}}","language":"java","input":""}'
```

### Frontend Test

1. Open CodeSphere Code Editor
2. Write code (any language)
3. Click "Run"
4. Verify output in terminal

---

## Troubleshooting

### Error: "Failed to execute code on Judge0"

**Problem:** Backend can't reach Judge0 API

**Checks:**
```bash
# 1. Verify JUDGE0_HOST is correct
cat backend/.env | grep JUDGE0_HOST

# 2. Verify public API is reachable
curl https://ce.judge0.com/languages

# 3. Restart backend
cd backend && npm start

# 4. Check backend logs for specific errors
```

### Rate Limited

**Problem:** Too many submissions, getting rate-limited

**Solution:**
- Use locally self-hosted Judge0 (no rate limits)
- Or wait and try again (limit resets daily)

---

## Advanced: Self-Hosted Production

For production with unlimited submissions:

### Deploy Judge0 Separately

Use `docker/judge0-ce/` folder to deploy self-hosted Judge0 on Render:

1. Create separate GitHub repo from `docker/judge0-ce/`
2. Deploy to Render as separate Docker service
3. Set backend's `JUDGE0_HOST=https://judge0-service.onrender.com`

See [docker/DEPLOYMENT.md](../docker/DEPLOYMENT.md) for full instructions.

---

## Configuration

### Environment Variables

| Variable | Value | Description |
|---|---|---|
| `JUDGE0_HOST` | `https://ce.judge0.com` | Public API (recommended) |
| `JUDGE0_HOST` | `http://localhost:2358` | Local development |
| `JUDGE0_HOST` | `https://judge0-service.onrender.com` | Self-hosted on Render |

---

## Architecture

```
Frontend (React)
    ↓
Backend (Node.js)
    ↓
Judge0 API (https://ce.judge0.com)
    ↓
Sandbox (C, C++, Python, Java, etc.)
    ↓
Output (stdout, stderr, compilation errors)
```

---

## Resources

- **Judge0 Public API:** https://ce.judge0.com/
- **Judge0 GitHub:** https://github.com/judge0/judge0
- **Supported Languages:** https://ce.judge0.com/languages
- **CodeSphere GitHub:** [Your repo URL]

---

## Summary

✅ **Public API** = Easiest, recommended for production  
✅ **Local self-hosted** = Full control, no rate limits, for development  
✅ **No API key needed** = Both options are free  
✅ **No Docker required for production** = Just set environment variable  

**Status:** ✅ Ready for Production  
**Last Updated:** 2025

---

## Quick Start (Local Development)

### Prerequisites
- Docker installed on your machine ([Download](https://www.docker.com/products/docker-desktop))
- Backend code pulled (`cd backend`)

### Step 1: Start Judge0 CE in Docker

```bash
docker run -p 2358:2358 judge0/judge0:latest
```

This starts Judge0 with:
- API on `http://localhost:2358`
- PostgreSQL database built-in
- No authentication needed

> **Note:** First run may take 1-2 minutes to initialize the database.

### Step 2: Verify Judge0 is Running

```bash
curl http://localhost:2358/languages
```

You should see a list of supported languages (60+ languages).

### Step 3: Configure Backend

Ensure `backend/.env` has:
```
JUDGE0_HOST=http://localhost:2358
```

### Step 4: Start Backend

```bash
cd backend
npm install  # if not done
npm start
```

### Step 5: Test Code Compilation

**Frontend Test:**
1. Navigate to http://localhost:5173 (or your frontend URL)
2. Go to the Code Editor
3. Write simple code (e.g., `print("Hello, World!")` in Python)
4. Click "Run" or "Submit"

**CLI Test:**
```bash
curl -X POST http://localhost:3000/code/compile \
  -H "Content-Type: application/json" \
  -d '{
    "code": "print(\"Hello, World!\")",
    "language": "python",
    "input": ""
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "run": {
      "stdout": "Hello, World!\n",
      "stderr": "",
      "status": "Accepted"
    }
  }
}
```

---

## Production Deployment (Render)

### Option 1: Judge0 on Separate Render Service (Recommended)

#### Step 1: Create Judge0 Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Docker"
3. Configure:
   - **Name:** `judge0-service`
   - **Docker Image URL:** `judge0/judge0:latest`
   - **Port:** `2358`
4. Add environment variable:
   - **Key:** `JUDGE0_HEALTHCHECK_WORKERS_COUNT=1` (keeps free tier resource usage low)
5. Create the service

#### Step 2: Get Judge0 Service URL

Once deployed, you'll get a URL like: `https://judge0-service.onrender.com`

#### Step 3: Update Main Backend Service

In your Render backend service environment variables, add:
```
JUDGE0_HOST=https://judge0-service.onrender.com
```

#### Step 4: Redeploy Backend

Push a change or click "Deploy" in Render to pick up the new environment variable.

---

### Option 2: Judge0 in Same Docker Compose (Advanced)

If you're using Docker Compose for the entire application:

```yaml
version: '3.8'

services:
  judge0:
    image: judge0/judge0:latest
    ports:
      - "2358:2358"
    environment:
      JUDGE0_HEALTHCHECK_WORKERS_COUNT: 1

  backend:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      JUDGE0_HOST: http://judge0:2358
    depends_on:
      - judge0
```

---

### Option 3: External Judge0 Instance

If you have a Judge0 instance running elsewhere (e.g., dedicated server), point to it:

```
JUDGE0_HOST=https://your-judge0-server.com:2358
```

---

## Supported Languages

CodeSphere supports the following languages via Judge0:

| Language      | Judge0 ID | Status     |
|---|---|---|
| C             | 50        | ✅ Supported |
| C++           | 54        | ✅ Supported |
| Python 3      | 71        | ✅ Supported |
| Java          | 62        | ✅ Supported |
| JavaScript    | 63        | ✅ Supported |
| Go            | 60        | ✅ Supported |
| Rust          | 73        | ✅ Supported |
| TypeScript    | 74        | ✅ Supported |
| Kotlin        | 48        | ✅ Supported |

Judge0 CE supports 60+ additional languages. To add more:

1. Query the Judge0 API: `GET /languages`
2. Update `backend/controllers/codeController.js` with the language mapping
3. Test and commit

---

## Configuration

### Environment Variables

| Variable       | Default              | Description                                    |
|---|---|---|
| `JUDGE0_HOST`  | `http://localhost:2358` | URL of Judge0 CE API (local or remote) |

### Backend Configuration

The backend automatically handles:
- Language normalization (e.g., `"c++"` → `"cpp"`)
- Language ID mapping to Judge0 IDs
- Code submission with proper timeout (30 seconds)
- Error handling and status reporting

### Check Status Endpoint

```bash
curl http://localhost:3000/code/status
```

Response:
```json
{
  "success": true,
  "platform": "Judge0 CE (Self-Hosted)",
  "judge0_host": "http://localhost:2358",
  "supported": {
    "c": true,
    "cpp": true,
    "python": true,
    "java": true,
    "javascript": true,
    "go": true,
    "rust": true
  },
  "available_languages": 60
}
```

---

## Testing

### Unit Test: Language Support

```bash
# Verify all languages map correctly
npm test -- codeController.test.js
```

### Integration Test: Full Flow

```bash
# 1. Ensure Judge0 is running
docker ps | grep judge0

# 2. Ensure backend is running
npm start &

# 3. Test Python
curl -X POST http://localhost:3000/code/compile \
  -H "Content-Type: application/json" \
  -d '{"code":"print(1+1)","language":"python","input":""}'

# 4. Test C++
curl -X POST http://localhost:3000/code/compile \
  -H "Content-Type: application/json" \
  -d '{"code":"#include <iostream>\nint main(){std::cout<<\"Hello\"<<std::endl;}","language":"cpp","input":""}'

# 5. Test Java
curl -X POST http://localhost:3000/code/compile \
  -H "Content-Type: application/json" \
  -d '{"code":"public class Main { public static void main(String[] args) { System.out.println(\"Hello\"); } }","language":"java","input":""}'
```

### Frontend Test

1. Open Code Editor
2. Create/update code
3. Click "Run"
4. Verify output in terminal

---

## Troubleshooting

### Judge0 Container Won't Start

**Problem:** `docker run` fails or container exits immediately

**Solutions:**
```bash
# Check logs
docker logs <container_id>

# Increase memory (if needed)
docker run -p 2358:2358 -m 2g judge0/judge0:latest

# Use a specific stable version
docker run -p 2358:2358 judge0/judge0:1.13.0
```

---

### Backend Can't Connect to Judge0

**Problem:** `Failed to execute code on Judge0. Make sure Judge0 is running.`

**Checks:**
```bash
# 1. Verify Judge0 port is open
curl http://localhost:2358/languages

# 2. Check JUDGE0_HOST in backend .env
cat backend/.env | grep JUDGE0_HOST

# 3. Restart backend
npm start

# 4. Check backend logs for connection errors
```

---

### Compilation Timeout

**Problem:** Code compilation takes too long (>30 seconds)

**Solutions:**
- Judge0 timeout is 30 seconds by default
- For infinite loops or long-running code, the process will be killed
- This is intentional for security (prevent resource exhaustion)

---

### Language Not Supported

**Problem:** `Language 'X' is not supported`

**Solutions:**
1. Check if Judge0 supports it: `curl http://localhost:2358/languages | grep -i "<language_name>"`
2. Add to language mapping in `backend/controllers/codeController.js`
3. Test and commit

Example: To add **Perl** (language ID 54):
```javascript
// In getJudge0LanguageId()
case "perl":
  return 54;
```

---

### Render Deployment Issues

**Problem:** Backend on Render can't reach Judge0 CE

**Solutions:**

1. **Check URLs are correct:**
   - Judge0 service URL: `https://judge0-service.onrender.com` (HTTPS)
   - Backend has env var set: `JUDGE0_HOST=https://judge0-service.onrender.com`

2. **Check both services are running:**
   - Visit Judge0 URL in browser: `https://judge0-service.onrender.com/languages`
   - Check backend status: `https://codesphere.onrender.com/code/status`

3. **Restart services:**
   - Render Dashboard → Judge0 Service → "Manual Deploy"
   - Render Dashboard → Backend Service → "Manual Deploy"

4. **Check logs:**
   - Backend Logs: Look for "Judge0 submission error"
   - Judge0 Logs: Check for connection/startup issues

---

## Security Notes

### Judge0 CE Security

Judge0 runs code in sandboxed Docker containers with:
- Memory limits (configurable, default 64MB)
- CPU limits
- Network isolation (code can't access internet)
- Filesystem isolation (code can't access host filesystem)

### Production Best Practices

1. **Keep Judge0 Internal:** Don't expose Judge0 API directly to users; route through backend
2. **Rate Limiting:** Add rate limits in backend to prevent abuse
3. **Monitoring:** Monitor Judge0 resource usage (CPU, memory) on production
4. **Backups:** No persistent data in Judge0 by default; state is ephemeral

---

## Additional Resources

- **Judge0 GitHub:** https://github.com/judge0/judge0
- **Judge0 API Docs:** https://ce.judge0.com/
- **Docker Hub:** https://hub.docker.com/r/judge0/judge0
- **CodeSphere GitHub:** [Your repo URL]

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Judge0 logs: `docker logs <judge0_container_id>`
3. Open an issue on GitHub with logs and steps to reproduce

---

**Last Updated:** 2025
**Judge0 Version:** Latest stable
**Status:** ✅ Production Ready
