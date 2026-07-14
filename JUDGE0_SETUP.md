# Judge0 Integration Setup Guide

Your CodeSphere backend now uses **Judge0** for reliable multi-language code compilation and execution. This eliminates the need to install compilers on your server.

## What is Judge0?

Judge0 is a free, open-source code execution API that supports:
- **C** (gcc)
- **C++** (g++)
- **Python** (Python 3)
- **Java**
- **JavaScript** (Node.js)
- **Go**
- **Rust**
- And 60+ more languages

## Setup Steps

### 1. Get a Judge0 API Key (Free)

1. Go to [RapidAPI - Judge0 CE](https://rapidapi.com/judge0-official/api/judge0-ce)
2. Click **"Sign Up"** (or log in if you have an account)
3. Click **"Subscribe"** on the free plan
4. Go to **"Code Snippets"** or **"Endpoints"** tab
5. Copy your **API Key** (in the header `X-RapidAPI-Key`)

### 2. Add API Key to Your Backend

Edit `backend/.env`:

```env
# Judge0 API (for code compilation and execution)
JUDGE0_API_KEY=YOUR_API_KEY_HERE
JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
```

**Replace `YOUR_API_KEY_HERE`** with your actual API key from step 1.

### 3. Restart Your Backend

```bash
cd backend
npm start
# or for development:
npm run dev
```

## Testing

### Test Locally

```bash
curl -X POST http://localhost:4000/code/compile \
  -H "Content-Type: application/json" \
  -d '{
    "language": "C++",
    "code": "#include <iostream>\nint main() { std::cout << \"Hello\"; return 0; }",
    "input": ""
  }'
```

Expected response:
```json
{
  "success": true,
  "data": {
    "run": {
      "stdout": "Hello",
      "stderr": "",
      "status": "Accepted"
    }
  }
}
```

### Check Compiler Availability

```bash
curl http://localhost:4000/code/status
```

Response:
```json
{
  "success": true,
  "platform": "Judge0",
  "configured": true,
  "supported": {
    "c": true,
    "cpp": true,
    "python": true,
    "java": true,
    "javascript": true,
    "go": true,
    "rust": true
  }
}
```

## Deployment on Render

1. Set environment variables in Render Dashboard:
   - Go to **Settings** → **Environment Variables**
   - Add:
     ```
     JUDGE0_API_KEY=your_api_key
     JUDGE0_API_HOST=judge0-ce.p.rapidapi.com
     ```

2. Redeploy your backend service

3. Test via browser: `https://your-render-domain.onrender.com/code/status`

## Supported Languages (Room Language Mapping)

When creating a room, use these language values:

| Room Language | Judge0 Language | Language ID |
|---|---|---|
| `c` | C | 50 |
| `cpp` or `c++` | C++ | 54 |
| `python` or `python3` | Python 3 | 71 |
| `java` | Java | 62 |
| `javascript` or `nodejs` | Node.js | 63 |
| `go` | Go | 60 |
| `rust` | Rust | 73 |
| `typescript` | TypeScript | 74 |

## Rate Limits

**Free Tier (RapidAPI):**
- 100 requests per day
- 10 requests per second

Upgrade to a paid plan for higher limits if needed.

## Troubleshooting

### Error: "Judge0 API key not configured"

- Ensure `JUDGE0_API_KEY` is set in `.env` (local) or Render environment variables (production)
- Restart your backend after adding the key

### Error: "Failed to execute code on Judge0"

- Check if your API key is correct
- Verify your RapidAPI account is active
- Check the free tier rate limits (100 requests/day)

### Compilation/Runtime Error but Code Should Work

- Check stderr output for compiler/runtime errors
- Verify language-specific syntax (e.g., Java class name must match file name)
- Test with a simpler program first

## Next Steps

1. **Push to GitHub:**
   ```bash
   git add backend/controllers/codeController.js
   git commit -m "Integrate Judge0 for multi-language compilation"
   git push origin main
   ```

2. **Deploy to Render:**
   - Add `JUDGE0_API_KEY` to environment variables
   - Redeploy the backend service

3. **Test in Your App:**
   - Create a room with any supported language
   - Write and run code from the editor
   - Verify stdout/stderr output

## References

- [Judge0 Documentation](https://ce.judge0.com/)
- [RapidAPI Judge0](https://rapidapi.com/judge0-official/api/judge0-ce)
- [Supported Languages List](https://ce.judge0.com/languages)
