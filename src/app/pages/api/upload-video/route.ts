import { NextRequest, NextResponse } from "next/server";
const cloudinary = require('cloudinary').v2
import VideoModel from '../../../models/Video'; // Import the Mongoose model
import { connectMongo } from '../../../../lib/mongo'; // Import MongoDB connection function
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
interface CloudinaryUploadResult {
  public_id: string;
  bytes: number;
  duration?: number
  [key: string]: any
}
fal.config({
  credentials: process.env.FAL_KEY
});
await connectMongo();
export async function POST(req: NextRequest) {
  try {
    // Parse the incoming request
    const data = await req.formData();
    const file = data.get('file') as File; // Type cast to `File` for type safety
    const statedata = JSON.parse(data.get('data') as string).state;
    const userid = data.get('userid') as string;

    // Validate required parameters
    if (!file) {
      throw new Error("No file provided.");
    }
    if (!statedata) {
      throw new Error("State data is missing.");
    }

    // Log data for debugging purposes
    console.log('data:', data);
    console.log('file:', file);
    console.log('file.name:', file.name);
    console.log('userid:', userid);

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
    const cloudinaryResult = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "video-uploads",
          transformation: [
            { quality: "auto", fetch_format: "mp4" },
          ]
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else {
            resolve(result as CloudinaryUploadResult);
          }
        }
      );
      uploadStream.end(buffer);
    });

    console.log('cloudinaryResult:', cloudinaryResult);

    // Process the video for captions using Fal AI
    const result2 = await fal.subscribe("fal-ai/auto-caption", {
      input: {
        video_url: cloudinaryResult.url,
        top_align: subtitlePosition,
        font_size: fontSize,
        txt_font: fontStyle,
        txt_color: textColor,
      },
      logs: true,
      onQueueUpdate: (update) => {
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
    });

    // Handle possible failure in captioning
    if (!result2 || !result2.data || !result2.data.video_url) {
      throw new Error("Fal AI failed to generate captioned video.");
    }

    console.log('result2:', result2);

    // Fetch the captioned video URL from Fal AI
    const captionedVideoUrlFromFalAI = result2.data.video_url;

    // Upload the captioned video to Cloudinary
    const captionedCloudinaryResult = await new Promise<CloudinaryUploadResult>(async (resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "video",
          folder: "video-uploads",
          transformation: [
            { quality: "auto", fetch_format: "mp4" },
          ]
        },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload of captioned video failed: ${error.message}`));
          } else {
            resolve(result as CloudinaryUploadResult);
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
    });

    console.log('captionedCloudinaryResult:', captionedCloudinaryResult);

    // Save the video data in the database (MongoDB)
    const video = new VideoModel({
      userid,
      originalVideoUrl: cloudinaryResult.url,
      captionedVideoUrl: captionedCloudinaryResult.url,
      fileName: file.name,
      downloadLink: result2.data.video_url,
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
      originalVideoUrl: cloudinaryResult.url,
      captionedVideoUrl: captionedCloudinaryResult.url,
      fileName: file.name,
      downloadLink: result2.data.video_url,
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
