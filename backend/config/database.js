import mongoose from "mongoose";

export const connectDB = async () => {
    if (!process.env.MONGODB_URL) {
        throw new Error("MONGODB_URL is not set. Create a backend/.env file (see .env.example).");
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL, {
            // dbName: "CodeSphere",
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        throw error;
    }
}
