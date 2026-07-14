import { execFile, execFileSync } from "child_process";
import fs from "fs/promises";
import os from "os";
import path from "path";
import { promisify } from "util";
import { Room } from "../models/Room.model.js";
import { User } from "../models/User.model.js";
import { Code } from "../models/Code.model.js";

const execFileAsync = promisify(execFile);

const writeTempFile = async (content, ext, filename) => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "codesphere-"));
    const filePath = path.join(tempDir, filename || `source.${ext}`);
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

const isCommandAvailable = (command, args = ["--version"]) => {
    if (!command) return false;

    try {
        execFileSync(command, args, {
            stdio: "ignore",
        });
        return true;
    } catch (error) {
        return false;
    }
};

const findAvailableCommand = (commands) => {
    for (const command of commands) {
        const args = ["--version"];
        if (command === "java" || command === "javac") {
            args[0] = "-version";
        }
        if (isCommandAvailable(command, args)) {
            return command;
        }
    }
    return null;
};

const getJavaClassName = (source) => {
    const publicMatch = source.match(/public\s+class\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
    if (publicMatch?.[1]) return publicMatch[1];
    const classMatch = source.match(/class\s+([A-Za-z_$][A-Za-z0-9_$]*)/);
    return classMatch?.[1] || "Main";
};

const runLocalCode = async (language, code, input) => {
    const lang = resolveLanguage(language);

    if (lang === "c" || lang === "cpp") {
        const ext = lang === "c" ? "c" : "cpp";
        const compilers = lang === "c"
            ? ["gcc", "gcc-17", "gcc-13", "gcc-12", "gcc-11", "cc", "clang", "clang-17", "clang-13", "clang-12"]
            : ["g++", "g++-17", "g++-13", "g++-12", "g++-11", "c++", "clang++", "clang++-17", "clang++-13", "clang++-12"];
        const compiler = findAvailableCommand(compilers);
        if (!compiler) {
            return { stderr: `No C/C++ compiler found on the server. Expected one of: ${compilers.join(", ")}.` };
        }

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
        const runner = findAvailableCommand(["python3", "python"]);
        if (!runner) {
            return { stderr: "No Python interpreter found on the server. Expected python3 or python." };
        }

        const { tempDir, filePath } = await writeTempFile(code, "py");
        try {
            const { stdout, stderr } = await execFileAsync(runner, [filePath], {
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
        const runner = findAvailableCommand(["node"]);
        if (!runner) {
            return { stderr: "No Node.js runtime found on the server. Expected node." };
        }

        const { tempDir, filePath } = await writeTempFile(code, "js");
        try {
            const { stdout, stderr } = await execFileAsync(runner, [filePath], {
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
        const compiler = findAvailableCommand(["javac", "javac-21", "javac-20", "javac-19", "javac-18", "javac-17", "javac-11"]);
        const runtime = findAvailableCommand(["java", "java-21", "java-20", "java-19", "java-18", "java-17", "java-11"]);
        if (!compiler || !runtime) {
            return { stderr: "No Java compiler/runtime found on the server. Expected javac and java." };
        }

        const className = getJavaClassName(code);
        const { tempDir, filePath } = await writeTempFile(code, "java", `${className}.java`);
        try {
            await execFileAsync(compiler, [filePath], {
                timeout: 10000,
                maxBuffer: 10 * 1024 * 1024,
            });
            const { stdout, stderr } = await execFileAsync(runtime, ["-cp", tempDir, className], {
                input: input || "",
                timeout: 5000,
                maxBuffer: 10 * 1024 * 1024,
            });
            await cleanupTempDir(tempDir);
            return { stdout: stdout.toString(), stderr: stderr.toString(), compiler, runtime, className };
        } catch (runError) {
            await cleanupTempDir(tempDir);
            return {
                stderr: runError.stderr?.toString() || "",
                stdout: runError.stdout?.toString() || "",
                error: runError.message,
                compiler,
                runtime,
                className,
                code: runError.code,
                command: runError.cmd,
            };
        }
    }
}

export const compileCode = async (req, res) => {
    try {
        const { input, code, language } = req.body;

        if (!code || !language) {
            return res.status(400).json({ success: false, message: "Code and language are required" });
        }

        const normalizedLanguage = resolveLanguage(language);
        const result = await runLocalCode(normalizedLanguage, code, input);
        const failed = result.error || (result.stderr && !result.stdout);

        if (failed) {
            return res.status(500).json({
                success: false,
                message: `Local ${normalizedLanguage} execution failed.`,
                error: result,
            });
        }

        return res.status(200).json({ success: true, data: { run: result } });
    } catch (error) {
        console.error("Error in compileCode:", error?.message || error);
        return res.status(500).json({ success: false, message: "Code execution failed", error: error?.message || error });
    }
};

export const compileStatus = async (req, res) => {
    const supported = {
        c: findAvailableCommand(["gcc", "gcc-17", "gcc-13", "gcc-12", "gcc-11", "cc", "clang", "clang-17", "clang-13", "clang-12"]),
        cpp: findAvailableCommand(["g++", "g++-17", "g++-13", "g++-12", "g++-11", "c++", "clang++", "clang++-17", "clang++-13", "clang++-12"]),
        python: findAvailableCommand(["python3", "python"]),
        javascript: findAvailableCommand(["node"]),
        java: {
            compiler: findAvailableCommand(["javac", "javac-21", "javac-20", "javac-19", "javac-18", "javac-17", "javac-11"]),
            runtime: findAvailableCommand(["java", "java-21", "java-20", "java-19", "java-18", "java-17", "java-11"]),
        },
    };
    return res.status(200).json({ success: true, supported });
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