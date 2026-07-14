import axios from "axios";
import { Room } from "../models/Room.model.js";
import { User } from "../models/User.model.js";
import { Code } from "../models/Code.model.js";

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY;
const JUDGE0_API_HOST = process.env.JUDGE0_API_HOST || "judge0-ce.p.rapidapi.com";

const judge0Instance = axios.create({
    baseURL: `https://${JUDGE0_API_HOST}`,
    headers: {
        "X-RapidAPI-Key": JUDGE0_API_KEY,
        "X-RapidAPI-Host": JUDGE0_API_HOST,
    },
});

// Map room languages to Judge0 language IDs
const languageToJudge0Map = {
    c: 50,
    cpp: 54,
    python: 71,
    python2: 68,
    java: 62,
    javascript: 63,
    nodejs: 63,
    rust: 73,
    go: 60,
    kotlin: 48,
    typescript: 74,
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
        node: "nodejs",
        py: "python",
        python: "python",
        python3: "python",
        java: "java",
        c: "c",
        rust: "rust",
        go: "go",
    };
    return alias[lang] || lang;
};

const getJudge0LanguageId = (language) => {
    const resolved = resolveLanguage(language);
    return languageToJudge0Map[resolved] || null;
};

const submitToJudge0 = async (languageId, sourceCode, stdin = "") => {
    try {
        const response = await judge0Instance.post("/submissions", {
            language_id: languageId,
            source_code: sourceCode,
            stdin: stdin,
            wait: true, // Wait for completion instead of polling
        });

        const { token, status, stdout, stderr, compile_output } = response.data;

        // Parse Judge0 response
        return {
            token,
            status_id: status?.id,
            status_description: status?.description,
            stdout: stdout || "",
            stderr: stderr || "",
            compile_output: compile_output || "",
        };
    } catch (error) {
        console.error("Judge0 submission error:", error.message);
        return {
            error: error.message,
            stderr: error.response?.data?.message || "Failed to execute code on Judge0",
        };
    }
};

export const compileCode = async (req, res) => {
    try {
        const { input, code, language } = req.body;

        if (!code || !language) {
            return res.status(400).json({ success: false, message: "Code and language are required" });
        }

        if (!JUDGE0_API_KEY) {
            return res.status(500).json({
                success: false,
                message: "Judge0 API key not configured. Please set JUDGE0_API_KEY in environment variables.",
            });
        }

        const normalizedLanguage = resolveLanguage(language);
        const judge0LangId = getJudge0LanguageId(normalizedLanguage);

        if (!judge0LangId) {
            return res.status(400).json({
                success: false,
                message: `Language '${language}' is not supported. Supported languages: C, C++, Python, Java, JavaScript, Go, Rust.`,
            });
        }

        const result = await submitToJudge0(judge0LangId, code, input || "");

        if (result.error) {
            return res.status(500).json({
                success: false,
                message: "Code execution failed",
                error: result,
            });
        }

        // Determine success: compilation or runtime errors in stderr
        const hasError = result.stderr || result.compile_output;

        return res.status(200).json({
            success: !hasError,
            data: {
                run: {
                    stdout: result.stdout,
                    stderr: result.stderr || result.compile_output || "",
                    status: result.status_description,
                },
            },
        });
    } catch (error) {
        console.error("Error in compileCode:", error?.message || error);
        return res.status(500).json({ success: false, message: "Code execution failed", error: error?.message || error });
    }
};

export const compileStatus = async (req, res) => {
    return res.status(200).json({
        success: true,
        platform: "Judge0",
        configured: !!JUDGE0_API_KEY,
        supported: {
            c: true,
            cpp: true,
            python: true,
            java: true,
            javascript: true,
            go: true,
            rust: true,
        },
    });
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