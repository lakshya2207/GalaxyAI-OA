import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import { fal } from "@fal-ai/client";
import { connectMongo } from '../../../../lib/mongo'; // Import MongoDB connection function
import VideoModel from '../../../models/Video'; // Import the Mongoose model

// Initialize Cloudinary (with the correct config)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const config = {
    api: {
        bodyParser: false, // Disable the default body parser for file uploads
    },
};

fal.config({
    credentials: process.env.FAL_KEY
});

// MongoDB connection
await connectMongo();

export async function POST(req: NextRequest) {
    try {
        // Parse the incoming request
        const data = await req.formData();
        const fileName = data.get('fileName') as string; // Type cast to `File` for type safety
        const statedata = JSON.parse(data.get('data') as string).state;
        const userid = data.get('userid') as string;
        const originalVideoUrl = data.get('originalVideoUrl') as string;
        const captionedVideoUrl = data.get('captionedVideoUrl') as string;
        const downloadLink = data.get('downloadLink') as string;

        if (!statedata) {
            throw new Error("State data is missing.");
        }

        // Extract subtitle customization parameters
        const { subtitlePosition, fontSize, fontStyle, textColor } = statedata;

        // Check if all subtitle parameters are provided
        if (!subtitlePosition || !fontSize || !fontStyle || !textColor) {
            throw new Error("Missing required parameters for subtitle customization.");
        }
        // Validate required parameters
        if (!fileName) {
            throw new Error("No file provided.");
        }
        // Save the video data in the database (MongoDB)
        const video = new VideoModel({
            userid,
            originalVideoUrl: originalVideoUrl,
            captionedVideoUrl: captionedVideoUrl,
            fileName: fileName,
            downloadLink: downloadLink,
            parameters: {
                subtitlePosition,
                fontSize,
                fontStyle,
                textColor,
            },
        });
        await video.save();

        // Return the response with original and captioned video URLs
        return NextResponse.json({
            userid,
            originalVideoUrl: originalVideoUrl,
            captionedVideoUrl: captionedVideoUrl,
            fileName: fileName,
            downloadLink: downloadLink,
            parameters: {
                subtitlePosition,
                fontSize,
                fontStyle,
                textColor,
            },
        });

    } catch (error) {
        // Catch and handle errors
        console.error("Error processing video:", error.message);
        return NextResponse.json({ error: error.message || "An error occurred while processing the video." }, { status: 500 });
    }
}
