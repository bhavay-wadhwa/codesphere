import mongoose from "mongoose";

export const connectDB = async () => {
    if (!process.env.MONGODB_URL) {
        throw new Error("MONGODB_URL is not set. Create a backend/.env file (see .env.example).");
    }

    try {
        const conn = await mongoose.connect(process.env.MONGODB_URL, {
            dbName: process.env.MONGODB_DB_NAME || "CodeSphere",
        });
        console.log(`MongoDB Connected: ${conn.connection.host}`);

        // Defensive: drop a legacy unique index on `username` if present.
        // Some older deployments created a `username_1` unique index which
        // prevents inserting users when `username` is not provided (null).
        // Attempt to drop it on startup; ignore errors if not present or not permitted.
        try {
            const db = conn.connection.db;
            const coll = db.collection('users');
            const existingIndexes = await coll.indexes();
            if (existingIndexes.some(idx => idx.name === 'username_1')) {
                await coll.dropIndex('username_1');
                console.log('Dropped legacy index: username_1');
            }
        } catch (idxErr) {
            console.warn('Index cleanup skipped or failed (non-fatal):', idxErr.message);
        }
        return conn;
    } catch (error) {
        console.error(`Error: ${error.message}`);
        throw error;
    }
}
