import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import { fal } from "@fal-ai/client";
import { connectMongo } from '../../../../lib/mongo'; // Import MongoDB connection function

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
        const downloadLink = data.get('downloadLink') as string;



        // Captioned video URL from Fal AI
        const captionedVideoUrlFromFalAI = downloadLink;

        // Send the immediate response to the client
        NextResponse.json({ message: "Video processing started, you will receive updates." }, { status: 200 });

        // Start the Cloudinary upload asynchronously
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                resource_type: "video",
                folder: "video-uploads",
                transformation: [
                    { quality: "auto", fetch_format: "mp4" },
                ],
                // Webhook URL to notify when the upload is complete
                notification_url: process.env.CLOUDINARY_WEBHOOK_URL2
            },
            (error, result) => {
                if (error) {
                    console.error("Cloudinary upload error:", error);
                } else {
                    console.log("Upload result:", result);
                }
            }
        );

        // Fetch the video from Fal AI and convert it to a buffer for uploading
        const captionedBuffer = await fetch(captionedVideoUrlFromFalAI)
            .then((res) => res.arrayBuffer())
            .then((buffer) => Buffer.from(buffer))
            .catch((err) => {
                throw new Error(`Failed to fetch captioned video from Fal AI: ${err.message}`);
            });

        uploadStream.end(captionedBuffer);
        return NextResponse.json({ message: "Final Upload in progress" }, { status: 200 });

    } catch (error) {
        // Catch and handle errors
        console.error("Error processing video:", error.message);
        return NextResponse.json({ error: error.message || "An error occurred while processing the video." }, { status: 500 });
    }
}
