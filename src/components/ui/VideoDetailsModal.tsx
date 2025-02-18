import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from './dialog';
import { Button } from "./button";

const VideoDetailsModal = ({ video }) => {
  return (
    <>
      <Dialog>
        <DialogTrigger asChild>
      <Button className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
        More Details
      </Button>
        </DialogTrigger>

        <DialogContent className="w-[500px]">
          <DialogHeader>
            <DialogTitle>Video Details</DialogTitle>
          </DialogHeader>

          <div className="text-slate-800 text-lg mb-2">
            <p><b>Name:</b> {video.fileName || 'N/A'}</p>
            <p><b>Subtitle Position:</b> {video.parameters.subtitlePosition}</p>
            <p><b>Font Size:</b> {video.parameters.font_size}</p>
            <p><b>Font Style:</b> {video.parameters.fontStyle}</p>
            <p><b>Text Color:</b> {video.parameters.textColor}</p>

            {video.downloadLink && (
              <div className="mt-4">
                <a
                  href={video.downloadLink}
                  download
                  className="px-6 py-2 text-white bg-green-500 hover:bg-green-600 rounded-lg transition-colors"
                >
                  Download Now
                </a>
              </div>
            )}
          </div>

          <DialogDescription>
            {/* <Button
              variant="outline"
              onClick={() => window.history.back()} // You can replace this with custom close logic
              className="mt-4 w-full"
            >
              Close
            </Button> */}
          </DialogDescription>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default VideoDetailsModal;
