import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from 'cloudinary';
import { fal } from "@fal-ai/client";



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

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming request
    const data = await req.formData();
    const file = data.get('file') as File; // Type cast to `File` for type safety
    const statedata = JSON.parse(data.get('data') as string).state;


    // Validate required parameters
    if (!file) {
      throw new Error("No file provided.");
    }
    if (!statedata) {
      throw new Error("State data is missing.");
    }

    // Extract subtitle customization parameters
    const {
      subtitlePosition,
      fontSize,
      fontStyle,
      textColor,
    } = statedata;

    // Check if all subtitle parameters are provided
    if (!subtitlePosition || !fontSize || !fontStyle || !textColor) {
      throw new Error("Missing required parameters for subtitle customization.");
    }

    // Convert file to Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload the video to Cloudinary
    cloudinary.uploader.upload_stream(
      {
        resource_type: "video",
        folder: "video-uploads",
        transformation: [
          { quality: "auto", fetch_format: "mp4" },
        ],
        // Webhook URL to notify when upload completes or has issues
        notification_url: process.env.CLOUDINARY_WEBHOOK_URL, // Set this to your webhook URL
      },
      (error, result) => {
        if (error) {
          console.error("Cloudinary upload error:", error);
        } else {
          console.log("Upload result:", result);
        }
      }
    ).end(buffer);


    return NextResponse.json({ message: "Upload in progress" }, { status: 200 });


  } catch (error) {
    // Catch and handle errors
    console.error("Error processing video:", error.message);
    return NextResponse.json({ error: error.message || "An error occurred while processing the video." }, { status: 500 });
  }
}
