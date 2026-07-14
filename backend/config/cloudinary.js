import {v2 as cloudinary } from "cloudinary";

export const cloudinaryConfig = () => {
    try{
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME || process.env.cloudinary_cloud_name,
            api_key: process.env.CLOUDINARY_API_KEY || process.env.cloudinary_api_key,
            api_secret: process.env.CLOUDINARY_API_SECRET || process.env.cloudinary_api_secret
        })
    }catch(error){
        console.log("Error in cloudinary config");
    }
}
