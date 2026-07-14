const express = require('express');
const bodyParser = require('body-parser');
const { writeFileSync, rmSync, chmodSync } = require('fs');
const { join } = require('path');
const os = require('os');
const { exec } = require('child_process');
const tmp = require('tmp');

const app = express();
app.use(bodyParser.json({ limit: '2mb' }));

const API_KEY = process.env.COMPILE_WORKER_KEY || null;
const PORT = process.env.PORT || 3001;

function runCommand(cmd, opts = {}) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: opts.timeout || 15000, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ err, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

function ensureAuth(req, res) {
  if (!API_KEY) return true;
  const key = req.headers['x-api-key'];
  if (!key || key !== API_KEY) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.post('/compile', async (req, res) => {
  if (!ensureAuth(req, res)) return;
  const { language, code, input } = req.body || {};
  if (!language || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: 'language and code are required' });
  }

  const dir = tmp.dirSync({ unsafeCleanup: true });
  const workdir = dir.name;
  try {
    if (language === 'javascript' || language === 'js' || language === 'node') {
      const file = join(workdir, 'index.js');
      writeFileSync(file, code);
      const cmd = input ? `node ${file} <<'__EOF__'\n${input}\n__EOF__` : `node ${file}`;
      const r = await runCommand(cmd, { timeout: 20000 });
      return res.json({ success: true, run: { stdout: r.stdout, stderr: r.stderr } });
    }

    if (language === 'python' || language === 'py') {
      const file = join(workdir, 'main.py');
      writeFileSync(file, code);
      const cmd = input ? `python3 ${file} <<'__EOF__'\n${input}\n__EOF__` : `python3 ${file}`;
      const r = await runCommand(cmd, { timeout: 20000 });
      return res.json({ success: true, run: { stdout: r.stdout, stderr: r.stderr } });
    }

    if (language === 'c' || language === 'cpp' || language === 'c++') {
      const ext = language === 'c' ? 'c' : 'cpp';
      const src = join(workdir, `main.${ext}`);
      const out = join(workdir, 'a.out');
      writeFileSync(src, code);
      const compiler = language === 'c' ? 'gcc' : 'g++';
      const compileCmd = `${compiler} ${src} -o ${out}`;
      const comp = await runCommand(compileCmd, { timeout: 20000 });
      if (comp.err) {
        return res.json({ success: false, run: { stdout: comp.stdout, stderr: comp.stderr } });
      }
      chmodSync(out, 0o755);
      const runCmd = input ? `${out} <<'__EOF__'\n${input}\n__EOF__` : `${out}`;
      const r = await runCommand(runCmd, { timeout: 20000 });
      return res.json({ success: true, run: { stdout: r.stdout, stderr: r.stderr } });
    }

    if (language === 'java') {
      const src = join(workdir, `Main.java`);
      writeFileSync(src, code);
      const compileCmd = `javac ${src}`;
      const comp = await runCommand(compileCmd, { timeout: 20000 });
      if (comp.err) {
        return res.json({ success: false, run: { stdout: comp.stdout, stderr: comp.stderr } });
      }
      const runCmd = input ? `java -cp ${workdir} Main <<'__EOF__'\n${input}\n__EOF__` : `java -cp ${workdir} Main`;
      const r = await runCommand(runCmd, { timeout: 20000 });
      return res.json({ success: true, run: { stdout: r.stdout, stderr: r.stderr } });
    }

    return res.status(400).json({ success: false, error: 'Unsupported language' });
  } catch (err) {
    return res.status(500).json({ success: false, error: String(err) });
  } finally {
    try { dir.removeCallback(); } catch (e) {}
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Compile worker listening on ${PORT}`);
});
