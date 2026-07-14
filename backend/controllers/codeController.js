import { execFile, execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import axios from "axios";
import { promisify } from "util";
import { Room } from "../models/Room.model.js";
import { User } from "../models/User.model.js";
import { Code } from "../models/Code.model.js";

const execFileAsync = promisify(execFile);

const writeTempFile = async (content, ext) => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codesphere-"));
    const filePath = path.join(tempDir, `source.${ext}`);
    await fs.writeFile(filePath, content, "utf8");
    return { tempDir, filePath };
};

const cleanupTempDir = async (dir) => {
    try {
        await fs.rm(dir, { recursive: true, force: true });
    } catch (err) {
        console.warn("Failed to clean up temp dir:", err.message);
    }
};

const resolveLanguage = (language) => {
    const lang = language?.toLowerCase?.().split(" ")[0] || "";
    const alias = {
        "c++": "cpp",
        cpp: "cpp",
        ts: "typescript",
        typescript: "typescript",
        js: "javascript",
        javascript: "javascript",
        node: "javascript",
        py: "python",
        python: "python",
        java: "java",
        c: "c",
        rust: "rust",
        go: "go",
    };
    return alias[lang] || lang;
};

const isCommandAvailable = (command) => {
    if (!command) return false;

    try {
        const result = execFileSync(command, ["--version"], {
            stdio: "ignore",
        });
        return result === null || result === undefined;
    } catch (error) {
        return false;
    }
};

const runLocalCode = async (language, code, input) => {
    const lang = resolveLanguage(language);

    if (lang === "c" || lang === "cpp") {
        const ext = lang === "c" ? "c" : "cpp";
        const compiler = lang === "c" ? "gcc" : "g++";
        const { tempDir, filePath } = await writeTempFile(code, ext);
        const exePath = path.join(tempDir, "program");
        const compileArgs = lang === "c"
            ? [filePath, "-o", exePath, "-O2", "-std=c11"]
            : [filePath, "-o", exePath, "-O2", "-std=c++17"];

        try {
            await execFileAsync(compiler, compileArgs, {
                timeout: 10000,
                maxBuffer: 10 * 1024 * 1024,
            });
        } catch (compileError) {
            await cleanupTempDir(tempDir);
            return { stderr: compileError.stderr?.toString() || compileError.message };
        }

        try {
            const { stdout, stderr } = await execFileAsync(exePath, [], {
                input: input || "",
                timeout: 5000,
                maxBuffer: 10 * 1024 * 1024,
            });
            await cleanupTempDir(tempDir);
            return { stdout: stdout.toString(), stderr: stderr.toString() };
        } catch (runError) {
            await cleanupTempDir(tempDir);
            return { stderr: runError.stderr?.toString() || runError.message };
        }
    }

    if (lang === "python") {
        const { tempDir, filePath } = await writeTempFile(code, "py");
        try {
            const { stdout, stderr } = await execFileAsync("python3", [filePath], {
                input: input || "",
                timeout: 5000,
                maxBuffer: 10 * 1024 * 1024,
            });
            await cleanupTempDir(tempDir);
            return { stdout: stdout.toString(), stderr: stderr.toString() };
        } catch (runError) {
            await cleanupTempDir(tempDir);
            return { stderr: runError.stderr?.toString() || runError.message };
        }
    }

    if (lang === "javascript") {
        const { tempDir, filePath } = await writeTempFile(code, "js");
        try {
            const { stdout, stderr } = await execFileAsync("node", [filePath], {
                input: input || "",
                timeout: 5000,
                maxBuffer: 10 * 1024 * 1024,
            });
            await cleanupTempDir(tempDir);
            return { stdout: stdout.toString(), stderr: stderr.toString() };
        } catch (runError) {
            await cleanupTempDir(tempDir);
            return { stderr: runError.stderr?.toString() || runError.message };
        }
    }

    if (lang === "java") {
        const { tempDir, filePath } = await writeTempFile(code, "java");
        try {
            await execFileAsync("javac", [filePath], {
                timeout: 10000,
                maxBuffer: 10 * 1024 * 1024,
            });
            const className = path.basename(filePath, ".java");
            const { stdout, stderr } = await execFileAsync("java", ["-cp", tempDir, className], {
                input: input || "",
                timeout: 5000,
                maxBuffer: 10 * 1024 * 1024,
            });
            await cleanupTempDir(tempDir);
            return { stdout: stdout.toString(), stderr: stderr.toString() };
        } catch (runError) {
            await cleanupTempDir(tempDir);
            return { stderr: runError.stderr?.toString() || runError.message };
        }
    }

    return { stderr: `Local execution for language '${language}' is not supported. Set PISTON_URL to a valid Piston instance or install a supported compiler on the server.` };
};

export const compileCode = async (req, res) => {
    try {
        const { input, code, language } = req.body;

        if (!code || !language) {
            return res.status(400).json({ success: false, message: "Code and language are required" });
        }

        const normalizedLanguage = resolveLanguage(language);
        const localSupported = {
            c: "gcc",
            cpp: "g++",
            python: "python3",
            javascript: "node",
            java: "javac",
        };
        const pistonUrl = process.env.PISTON_URL || process.env.JUDGE0_URL || null;
        const remoteService = process.env.JUDGE0_URL ? "judge0" : "piston";

        const localCompiler = localSupported[normalizedLanguage];
        const hasLocalCompiler = localCompiler && isCommandAvailable(localCompiler);

        if (hasLocalCompiler) {
            const result = await runLocalCode(normalizedLanguage, code, input);
            if (!result.stderr || result.stdout) {
                return res.status(200).json({ success: true, data: { run: result } });
            }
            console.warn("Local execution failed for", normalizedLanguage, result.stderr);
        }

        if (!pistonUrl) {
            return res.status(500).json({
                success: false,
                message: `No available compiler for language '${normalizedLanguage}'. Install the required compiler or configure a remote compiler service.`,
                error: hasLocalCompiler ? "Local compilation failed" : "Local compiler not installed",
            });
        }

        const remoteRequest = async () => {
            if (process.env.JUDGE0_URL) {
                const encodedSource = Buffer.from(code).toString("base64");
                const encodedStdin = Buffer.from(input || "").toString("base64");
                const response = await axios.post(
                    `${process.env.JUDGE0_URL}/submissions?base64_encoded=true&wait=true`,
                    {
                        source_code: encodedSource,
                        stdin: encodedStdin,
                        language_id: parseInt(process.env.JUDGE0_LANG_ID || "52", 10),
                    },
                    { headers: { "Content-Type": "application/json", "Accept": "application/json" } }
                );
                return {
                    stdout: Buffer.from(response.data.stdout || "", "base64").toString("utf8"),
                    stderr: Buffer.from(response.data.stderr || "", "base64").toString("utf8"),
                };
            }

            const response = await axios.post(pistonUrl, {
                language: normalizedLanguage,
                version: "*",
                files: [{ content: code }],
                stdin: input || "",
                timeout: 10,
            });
            return response.data;
        };

        try {
            const data = await remoteRequest();
            return res.status(200).json({ success: true, data });
        } catch (error) {
            const remoteError = error.response?.data || error.message || error;
            console.warn("Remote execution failed for", remoteService, normalizedLanguage, remoteError);
            return res.status(502).json({
                success: false,
                message: "Remote code execution failed",
                error: remoteError,
            });
        }
    } catch (error) {
        console.error("Error in compileCode:", error.response?.data || error.message || error);
        const status = error.response?.status || 502;
        return res.status(status).json({ success: false, message: "Code execution failed", error: error.response?.data || error.message });
    }
};

export const codeSave = async (data) => {
    try {
        const { code, userId, language, roomId } = data;

        if (code === null || code === undefined || !language || !roomId || !userId) {
            return ;
        }

        const user = await User.findById(userId);
        if (!user) {
            return;
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return;
        }

        const codeModel = await Code.findOneAndUpdate(
            { user: user._id, roomId}, 
            { user: user._id, language, roomId, code },
            { upsert: true, new: true }
        );
        
        if (!codeModel) {
            return;
        }

    } catch (error) {
        console.log("Error occured in codeSave");
    }
}

export const getCode = async (req, res) => {
    try {
        const { roomId } = req.body;
        const userId = req.user.id;

        if (!userId || !roomId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found",
            });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(400).json({
                success: false,
                message: "Room not found",
            });
        }

        const code = await Code.findOne({ user: user._id, roomId });
        if (!code) {
            return res.status(204).json({
                success: false,
                message: "Code not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Code get successfully",
            code
        })

    } catch (error) {
        console.log("Error in getCode");
    }
}

export const getRemoteCode = async (req, res) => {
    try {
        const { roomId, userId } = req.body;

        if (!userId || !roomId) {
            return res.status(400).json({
                success: false,
                message: "All fields are required",
            });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(400).json({
                success: false,
                message: "User not found",
            });
        }

        const room = await Room.findById(roomId);
        if (!room) {
            return res.status(400).json({
                success: false,
                message: "Room not found",
            });
        }

        const code = await Code.findOne({ user: user._id, roomId });
        if (!code) {
            return res.status(204).json({
                success: false,
                message: "Code not found",
            });
        }

        return res.status(200).json({
            success: true,
            message: "Code get successfully",
            code
        })

    } catch (error) {
        console.log("Error in getCode");
    }
}