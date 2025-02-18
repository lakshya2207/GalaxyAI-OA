import { NextRequest, NextResponse } from "next/server";
import VideoModel from '../../../../models/Video'; // Import the Mongoose model
import { connectMongo } from '../../../../../lib/mongo';

await connectMongo();

export async function GET(req: NextRequest) {
    try {
        // Extract the `userid` from the URL path
        const urlParts = req.nextUrl.pathname.split('/'); // Split the path by '/'
        const userid = urlParts[urlParts.length - 1]; // `userid` should be the last part

        console.log('Extracted UserID:', userid);

        // Ensure `userid` is valid
        if (!userid) {
            return NextResponse.json({ error: "User ID is required" }, { status: 400 });
        }

        // Fetch videos for the given `userid`
        const videos = await VideoModel.find({ userid }); // Filter by `userid`

        if (videos.length === 0) {
            return NextResponse.json({ message: "No videos found for this user." }, { status: 404 });
        }

        // Return the filtered videos as JSON
        return NextResponse.json({
            message: "Videos retrieved successfully",
            videos,
        });
    } catch (error) {
        console.error("Error retrieving videos:", error);
        return NextResponse.json({ error: "An error occurred while retrieving the videos." }, { status: 500 });
    }
}
