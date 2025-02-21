import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

export const config = {
  api: {
    bodyParser: false, // Disable the default body parser for file uploads
  },
};

fal.config({
  credentials: process.env.FAL_KEY,
});

export async function POST(req: NextRequest) {
  try {
    // Parse the incoming request
    const data = await req.formData();
    const originalVideoUrl = data.get('originalVideoUrl') as string;
    const statedata = JSON.parse(data.get('data') as string).state;

    // Validate required parameters
    if (!originalVideoUrl || !statedata) {
      return NextResponse.json({ message: "No URL or state data provided" }, { status: 400 });
    }

    // Extract subtitle customization parameters
    const { subtitlePosition, fontSize, fontStyle, textColor } = statedata;

    // Start the Fal AI processing asynchronously without blocking the response
    const result2 = await 
     fal.subscribe("fal-ai/auto-caption", {
      input: {
        video_url: originalVideoUrl,
        top_align: subtitlePosition,
        font_size: fontSize,
        txt_font: fontStyle,
        txt_color: textColor,
      },
      logs: true,
      onQueueUpdate: (update) => {
        // You can log real-time progress here if needed
        if (update.status === "IN_PROGRESS") {
          update.logs.map((log) => log.message).forEach(console.log);
        }
      },
      // Webhook URL for updates
      webhookUrl: process.env.FAL_AI_WEBHOOK_URL,  // Set this to your webhook URL
    });

    console.log('result2:', result2);
    // Send an immediate response back to the client that processing has started
    return NextResponse.json({ message: "Video processing started, you will receive updates." }, { status: 200 });

  } catch (error) {
    console.error("Error processing video:", error.message);
    return NextResponse.json({ error: "Limit Expired May be" }, { status: 500 });
  }
}
