const toBoolean = (value, fallback = false) => {
    if (value === undefined || value === "") {
        return fallback;
    }

    return value.toLowerCase() === "true";
};

const getAllowedOrigins = () => (process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

export const getCorsOptions = () => ({
    origin(origin, callback) {
        // Requests without an Origin header, such as Render's health checks, are safe to allow.
        if (!origin || getAllowedOrigins().includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
});

export const getCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    const sameSite = process.env.COOKIE_SAME_SITE || "lax";
    const secure = toBoolean(process.env.COOKIE_SECURE, isProduction);
    const options = {
        httpOnly: true,
        maxAge: 365 * 24 * 60 * 60 * 1000,
        sameSite,
        secure,
    };

    if (process.env.COOKIE_DOMAIN) {
        options.domain = process.env.COOKIE_DOMAIN;
    }

    return options;
};

export const getClearCookieOptions = () => {
    const { maxAge, ...options } = getCookieOptions();
    return options;
};
