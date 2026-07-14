import otpGenerator from "otp-generator";
import { Otp } from "../models/Otp.model.js";
import { User } from "../models/User.model.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { getGoogleOAuthClient, isGoogleOAuthConfigured } from "../config/googleConfig.js";
import { getClearCookieOptions, getCookieOptions } from "../config/runtime.js";
import { isMailConfigured } from "../utils/mailSender.js";
import mailSender from "../utils/mailSender.js";
import mailTemplateCode from "../utils/mailTemplate.js";
import forgotPasswordTemplate from "../utils/forgotMail.js";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const OTP_LIFETIME_MS = 10 * 60 * 1000;

const normalizeEmail = (email) => (
    typeof email === "string" ? email.trim().toLowerCase() : ""
);

const publicUser = (user) => {
    const data = user.toObject ? user.toObject() : { ...user };
    delete data.password;
    return data;
};

const createAuthToken = (user) => {
    if (!process.env.JWT_SECRET) {
        throw new Error("JWT_SECRET is not configured");
    }

    const firstName = user.firstName?.trim() || "CodeSphere";
    const lastName = user.lastName?.trim() || "User";

    return jwt.sign({
        name: `${firstName} ${lastName}`,
        email: user.email,
        id: user._id,
    }, process.env.JWT_SECRET, { expiresIn: "365d" });
};

const sendAuthResponse = (res, status, user, message) => {
    const token = createAuthToken(user);
    return res.cookie("token", token, getCookieOptions()).status(status).json({
        success: true,
        message,
        user: publicUser(user),
    });
};

export const sendOtp = async (req, res) => {
    const email = normalizeEmail(req.body.email);

    if (!EMAIL_PATTERN.test(email)) {
        return res.status(400).json({ success: false, message: "Enter a valid email address" });
    }

    if (!isMailConfigured()) {
        return res.status(503).json({
            success: false,
            message: "Email delivery is not configured. Please contact the site administrator.",
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const otp = otpGenerator.generate(6, {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        });

        await Otp.deleteMany({ email });
        const otpRecord = await Otp.create({ email, otp });

        try {
            await mailSender(email, "Your CodeSphere verification code", mailTemplateCode(otp, email));
        } catch (mailError) {
            await Otp.findByIdAndDelete(otpRecord._id);
            console.error("OTP email failed:", mailError.message);
            return res.status(502).json({
                success: false,
                message: "We could not send the verification email. Please try again later.",
            });
        }

        return res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error) {
        console.error("Error in sendOtp:", error);
        return res.status(500).json({ success: false, message: "Unable to create an OTP" });
    }
};

export const emailSignup = async (req, res) => {
    try {
        const { firstName, lastName, password, otp } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!firstName?.trim() || !lastName?.trim() || !EMAIL_PATTERN.test(email) || !password || !otp) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const recentOtp = await Otp.findOne({ email }).sort({ createdAt: -1 });
        if (!recentOtp || recentOtp.createdAt.getTime() < Date.now() - OTP_LIFETIME_MS) {
            return res.status(400).json({ success: false, message: "OTP has expired. Request a new one." });
        }

        if (recentOtp.otp !== String(otp)) {
            return res.status(400).json({ success: false, message: "Invalid OTP" });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const user = await User.create({
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email,
            password: hashedPassword,
        });

        await Otp.deleteMany({ email });
        return sendAuthResponse(res, 201, user, "User created successfully");
    } catch (error) {
        console.error("Error in emailSignup:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const emailLogin = async (req, res) => {
    try {
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);

        if (!EMAIL_PATTERN.test(email) || !password) {
            return res.status(400).json({ success: false, message: "Email and password are required" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "Unauthorize" });
        }

        if (!user.password || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ success: false, message: "InvalidPassword" });
        }

        return sendAuthResponse(res, 200, user, "User logged in successfully");
    } catch (error) {
        console.error("Error in emailLogin:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

export const googleSignup = async (req, res) => {
    if (!isGoogleOAuthConfigured()) {
        return res.status(503).json({
            success: false,
            message: "Google sign-in is not configured. Please contact the site administrator.",
        });
    }

    if (!req.query.code) {
        return res.status(400).json({ success: false, message: "Google authorization code is required" });
    }

    try {
        const oauth2Client = getGoogleOAuthClient();
        const { tokens } = await oauth2Client.getToken(req.query.code);
        if (!tokens.access_token) {
            throw new Error("Google did not return an access token");
        }

        const googleResponse = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` },
        });
        if (!googleResponse.ok) {
            throw new Error("Unable to retrieve Google account details");
        }

        const data = await googleResponse.json();
        const email = normalizeEmail(data.email);
        if (!EMAIL_PATTERN.test(email) || data.verified_email === false) {
            return res.status(400).json({ success: false, message: "Google did not provide a verified email address" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return sendAuthResponse(res, 200, existingUser, "User logged in successfully");
        }

        const fullName = (data.name || "").trim();
        let firstName = data.given_name?.trim();
        let lastName = data.family_name?.trim();

        if (!firstName && !lastName && fullName) {
            const [first, ...rest] = fullName.split(" ");
            firstName = first;
            lastName = rest.join(" ") || "User";
        }

        if (!firstName) {
            firstName = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "") || "CodeSphere";
        }
        if (!lastName) {
            lastName = "User";
        }

        const user = await User.create({
            email,
            firstName,
            lastName,
            imageUrl: data.picture,
            googleId: data.id,
        });

        return sendAuthResponse(res, 201, user, "User created successfully");
    } catch (error) {
        console.error("Error in googleSignup:", error);
        return res.status(502).json({ success: false, message: "Google sign-in could not be completed" });
    }
};

export const logout = async (req, res) => {
    res.clearCookie("token", getClearCookieOptions());
    return res.status(200).json({ success: true, message: "User logged out successfully" });
};

export const sendMailForgotPassword = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        if (!EMAIL_PATTERN.test(email)) {
            return res.status(400).json({ success: false, message: "A valid email is required" });
        }

        if (!isMailConfigured()) {
            return res.status(503).json({ success: false, message: "Email delivery is not configured" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not configured");
        }

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "15m" });
        await mailSender(email, "Forgot Password? Add a new one", forgotPasswordTemplate(token, email));

        return res.status(200).json({ success: true, message: "Password reset email sent successfully" });
    } catch (error) {
        console.error("Error in sendMailForgotPassword:", error);
        return res.status(502).json({ success: false, message: "Unable to send password reset email" });
    }
};

export const verifyToken = async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            return res.status(400).json({ success: false, message: "Token is required" });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.status(200).json({ success: true, message: "Token verified successfully", decoded });
    } catch (error) {
        console.error("Error in verifyToken:", error);
        return res.status(401).json({
            success: false,
            message: error.message || "Invalid or expired token",
            error: {
                name: error.name || "JsonWebTokenError",
                message: error.message || "Invalid or expired token",
            },
        });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { password } = req.body;
        const email = normalizeEmail(req.body.email);
        if (!password || !EMAIL_PATTERN.test(email)) {
            return res.status(400).json({ success: false, message: "All fields are required" });
        }

        if (password.length < 6) {
            return res.status(400).json({ success: false, message: "Password must be at least 6 characters" });
        }

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ success: false, message: "User not found" });
        }

        user.password = await bcrypt.hash(password, 12);
        await user.save();

        return res.status(200).json({ success: true, message: "Password reset successfully" });
    } catch (error) {
        console.error("Error in resetPassword:", error);
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};
