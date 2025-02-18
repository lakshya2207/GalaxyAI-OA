import mongoose, { Document, Schema } from 'mongoose';

interface Video extends Document {
  userid: string;
  originalVideoUrl: string;
  captionedVideoUrl: string;
  fileName: string;
  downloadLink: { type: string},
  parameters: {
    refresh_interval: number;
    subtitlePosition: string;
    stroke_width: number;
    font_size: number;
    fontStyle: string;
    textColor: string;
  };
}

const VideoSchema = new Schema<Video>({
  userid: { type: String, required: true },
  originalVideoUrl: { type: String, required: true },
  captionedVideoUrl: { type: String},
  fileName: { type: String},
  downloadLink: { type: String},
  parameters: {
    refresh_interval: { type: Number},
    subtitlePosition: { type: String},
    stroke_width: { type: Number},
    font_size: { type: Number},
    fontStyle: { type: String},
    textColor: { type: String},
  },
}, { timestamps: true });

const VideoModel = mongoose.models.Video || mongoose.model<Video>('Video', VideoSchema);

export default VideoModel;
