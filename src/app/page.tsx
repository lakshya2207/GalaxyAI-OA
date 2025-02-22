"use client";
import { useUser } from "@clerk/nextjs";
import VideoDetailsModal from "@/components/ui/VideoDetailsModal";
import { Button } from "@/components/ui/button";
import { TypeAnimation } from "react-type-animation";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileUploaderRegular
} from "@uploadcare/react-uploader";
import "@uploadcare/react-uploader/core.css";
import { ChevronDown, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { io } from "socket.io-client";
interface VideoType {
  _id: string;
  originalVideoUrl: string;
  captionedVideoUrl: string;
}
interface ResData {
  originalVideoUrl: string;
  captionedVideoUrl: string;
  downloadLink: string;
  fileName: string;

}
import { Progress } from "@/components/ui/progress"

interface State {
  isAdvancedOpen: boolean;
  videoFile: File | null;
  uploadedFile: File | null;
  uploadedFileURL: string | null;
  isUploading: boolean;
  fontStyle: string;
  textColor: string;
  highlightColor: string;
  outlineColor: string;
  fontSize: number;
  maxCharacters: number;
  backgroundOpacity: number;
  outlineWidth: number;
  letterSpacing: number;
  autoTranslate: boolean;
  subtitlePosition: string;
}

export default function CaptionGenerator() {
  const { user, isSignedIn } = useUser();

  const [step, setStep] = useState(0)
  const [previous, setPrevious] = useState<VideoType[]>([]);
  const [responseData, setResponseData] = useState<ResData>({
    'originalVideoUrl': '',
    'captionedVideoUrl': '',
    'downloadLink': '',
    'fileName': ''
  });
  useEffect(() => {
    console.log('responseData', responseData);
  }, [responseData])
  useEffect(() => {
    if (!loadingf && responseData.originalVideoUrl) {
      handleGenerateCaptions2(responseData.originalVideoUrl);
    }
  }, [responseData.originalVideoUrl])
  useEffect(() => {
    if (responseData.downloadLink && responseData.originalVideoUrl) {
      handleGenerateCaptions3();
    }
  }, [responseData.downloadLink, responseData.originalVideoUrl])
  useEffect(() => {
    if (responseData.downloadLink && responseData.originalVideoUrl && responseData.captionedVideoUrl) {
      handleGenerateCaptions4();
    }
  }, [responseData.downloadLink, responseData.originalVideoUrl, responseData.captionedVideoUrl])
  useEffect(() => {
    // Connect to Socket.io server
    const socket = io(window.location.origin);

    // Listen for the webhook event
    socket.on('webhookEvent1', (data) => {
      if (step === 0) {
        setStep(1);
        setResponseData({
          ...responseData,
          originalVideoUrl: data.orgUrl || state.uploadedFileURL,
        });
        // alert("Step 1 done");

      }
    });
    socket.on('webhookEvent3', (data) => {
      console.log('data3', data);
      setStep(4);
      setResponseData((prevState) => ({
        ...prevState,
        captionedVideoUrl: data.captionedVideoUrl || responseData.downloadLink,
      })
      )
      // alert("Step 1 done");    

    });

    socket.on('webhookEvent2', (data) => {
      setLoadingf(false);
      console.log('data', data);
      // Check if the message indicates quota exceeded
      if (data.message && data.message === 'Quota exceeded') {
        // Handle the quota exceeded scenario
        setState((prevState) => ({
          ...prevState,
          isUploading: false,
        }));
        alert("Quota exceeded. Please check your plan or try again later.");
        setStep(0); // Optionally reset the step if quota exceeded, or adjust flow as needed
        return; // Exit early if quota is exceeded
      }

      // Handle the case when video processing is done and we receive the download link
      if (data.downloadLink) {
        setResponseData((prevState) => ({
          ...prevState,
          downloadLink: data.downloadLink,
        }));
        setStep(2);
        // Proceed with the next steps after processing the video
      }
    });

    // Clean up socket connection when the step reaches 3

    return () => {
      socket.disconnect(); // Clean up the socket connection on unmount
    };

  }, []);
  useEffect(() => {
    const getPrevious = async () => {
      if (user) {
        localStorage.setItem('userid', user.id)
        const response = await fetch(`/pages/api/upload-video/${user.id}`);
        const json = await response.json();
        setPrevious(json.videos);
      }
    };

    getPrevious(); // Fetch previous videos when `user` changes
  }, [user]);

  const [state, setState] = useState<State>({
    isAdvancedOpen: false,
    videoFile: null,
    uploadedFile: null,
    uploadedFileURL: null,
    isUploading: false,
    fontStyle: "Arial",
    textColor: "white",
    highlightColor: "yellow",
    outlineColor: "black",
    fontSize: 20,
    maxCharacters: 20,
    backgroundOpacity: 0,
    outlineWidth: 2.6,
    letterSpacing: 5,
    autoTranslate: false,
    subtitlePosition: "bottom",
  });

  useEffect(() => {
    console.log('state', state);
  }, [state])

  // Handle file selection from FileUploaderRegular
  const handleFileUpload = (event: { successCount: number; successEntries: Array<{ file: File; cdnUrl: string }> }) => {
    setState((prevState) => ({
      ...prevState,
      isUploading: true,
    }));

    if (event.successCount === 1) {
      const file = event.successEntries[0].file;
      const cdnUrl = event.successEntries[0].cdnUrl;
      setState((prevState) => ({
        ...prevState,
        videoFile: file, // File type
        uploadedFile: file,
        uploadedFileURL: cdnUrl, // string type
      }));
    }

    setState((prevState) => ({
      ...prevState,
      isUploading: false,
    }));
  };

  // Handle drag-and-drop file uploads
  const handleGenerateCaptions = async () => {
    console.log('isSignedIn', isSignedIn);
    console.log('user', user);
    if (!isSignedIn) {
      alert("Please sign in to continue");
      return;
    }
    if (!state.videoFile) {
      alert("Please upload a video first.");
      return;
    }

    setState((prevState) => ({
      ...prevState,
      isUploading: true,
    }));

    // Create FormData to send the video file to the backend
    const formData = new FormData();
    formData.append("userid", localStorage.getItem('userid') || user?.id);

    formData.append("file", state.videoFile); // Make sure this name is the same as what the backend expects
    formData.append("data", JSON.stringify({ state }));
    try {
      await fetch("pages/api/upload-video", {
        method: "POST",
        body: formData,
      });

    } catch (error) {
      console.error("Error:", error);
      alert("Error uploading video.");
      setState((prevState) => ({
        ...prevState,
        isUploading: false,
      }));
    } finally {
    }

  };
  const [loadingf, setLoadingf] = useState(false)
  const handleGenerateCaptions2 = async (originalVideoUrl: string) => {
    if (loadingf || step > 1) {
      return; // Prevent API call if it's already in progress or the step is completed
    }
    setLoadingf(true);
    setState((prevState) => ({
      ...prevState,
      isUploading: true,
    }));

    // Create FormData to send the video file to the backend
    const formData = new FormData();
    formData.append("originalVideoUrl", originalVideoUrl);
    formData.append("data", JSON.stringify({ state }));

    try {
      const response = await fetch("pages/api/uploadToFal", {
        method: "POST",
        body: formData,
      });

      // Handle the response as needed
      await response.json();
      // Process the result if necessary
    } catch (error) {
      console.error("Error:", error);
      alert("Error uploading video.");
    } finally {
      setLoadingf(false);
    }
  };
  const handleGenerateCaptions3 = async () => {
    setState((prevState) => ({
      ...prevState,
      isUploading: true,
    }));

    // Create FormData to send the video file to the backend
    const formData = new FormData();
    console.log('responseData', responseData); // Make sure this name is the same 
    formData.append("downloadLink", responseData.downloadLink);
    // Make sure this name is the same as what the backend expects
    formData.append("data", JSON.stringify({ state }));
    setStep(4)
    try {
      const response = await fetch("pages/api/finalSave", {
        method: "POST",
        body: formData,
      });
      await response.json()
      // setResponseData(data);
      setStep(0)
    } catch (error) {
      console.error("Error:", error);
      alert("Error Saving Data video.");
      setState((prevState) => ({
        ...prevState,
        isUploading: false,
      }));
    } finally {
    }


  };
  const handleGenerateCaptions4 = async () => {
    setState((prevState) => ({
      ...prevState,
      isUploading: true,
    }));

    // Create FormData to send the video file to the backend
    const formData = new FormData();
    console.log('responseData', responseData);
    formData.append("userid", localStorage.getItem('userid') || user.id);
    formData.append("originalVideoUrl", responseData.originalVideoUrl); // Make sure this name is the same 
    formData.append("downloadLink", responseData.downloadLink);
    formData.append("captionedVideoUrl", responseData.captionedVideoUrl);
    // Make sure this name is the same as what the backend expects
    formData.append("fileName", state.videoFile?.name); // Make sure this name is the same as what the backend expects

    formData.append("data", JSON.stringify({ state }));
    setStep(4)
    try {
      const response = await fetch("pages/api/finalDBSave", {
        method: "POST",
        body: formData,
      });
      const data = await response.json()
      setResponseData(data);
      setStep(0)
    } catch (error) {
      console.error("Error:", error);
      alert("Error Saving Data video.");
    } finally {
      setState((prevState) => ({
        ...prevState,
        isUploading: false,
      }));
    }


  };

  const handleAdvancedSettingChange = (key: string, value: any) => {
    setState((prevState) => ({
      ...prevState,
      [key]: value,
    }));
  };

  return (
    <>
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-center mb-2">
          AI Video Caption Generator
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Add professional captions to your video using AI
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Panel - Upload and Settings */}
          <div className="space-y-6 w-full p-4 border shadow-sm rounded-md">
            <div className="border rounded-lg p-4">
              <Label className="text-lg font-semibold text-slate-800">Upload Video</Label>
              {/* FileUploaderRegular Component */}
              <div className="mt-2 border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50">
                <FileUploaderRegular
                  onCommonUploadSuccess={e => handleFileUpload(e)}
                  ctxName="uc-light"
                  sourceList="local, camera, facebook, gdrive"
                  cameraModes="video"
                  classNameUploader="uc-light"
                  pubkey="990976fc9d317856dc5b"
                />
              </div>
            </div>

            {state.uploadedFileURL && (
              <video controls className="w-full max-w-3xl mx-auto rounded-lg">
                <source src={state.uploadedFileURL} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            )}

            <div>
              <Label>Subtitles Position</Label>
              <Select
                value={state.subtitlePosition}
                onValueChange={(value) => handleAdvancedSettingChange("subtitlePosition", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bottom">Bottom</SelectItem>
                  <SelectItem value="top">Top</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Choose where to position the subtitles in the video
              </p>
            </div>

            <Collapsible open={state.isAdvancedOpen} onOpenChange={(value) => handleAdvancedSettingChange("isAdvancedOpen", value)}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full flex justify-center">
                  Advanced Settings
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                {/* Advanced Settings */}
                <div>
                  <Label>Font Style</Label>
                  <Select
                    value={state.fontStyle}
                    onValueChange={(value) => handleAdvancedSettingChange("fontStyle", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Arial">Arial</SelectItem>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Garamond">Garamond</SelectItem>
                      <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                      <SelectItem value="Georgia">Georgia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Text Color</Label>
                  <Input
                    type="text"
                    value={state.textColor}
                    onChange={(e) => handleAdvancedSettingChange("textColor", e.target.value)}
                  />
                </div>

                <div>
                  <Label>Font Size</Label>
                  <Input
                    type="number"
                    value={state.fontSize}
                    onChange={(e) => handleAdvancedSettingChange("fontSize", parseInt(e.target.value))}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            <Button
              disabled={state.isUploading}
              onClick={handleGenerateCaptions} className="w-full bg-indigo-500 hover:bg-indigo-600">
              Generate Captions
            </Button>
          </div>

          {/* Right Panel - Preview */}
          <div className="mx-auto w-full border bg-white mt-6 md:mt-0 ml-6 p-4 md:p-6 rounded-lg shadow-md flex flex-col md:flex-row items-center justify-center">
            {responseData?.fileName !='' ? (
              <>
                <div className="captioned w-full md:w-auto grid space-y-4 md:space-y-0 md:grid-cols-1 md:max-w-3xl">
                  <Label className="mx-4 my-2 text-lg font-semibold text-slate-800 text-center md:text-left">Captioned Video</Label>

                  {/* Video Player */}
                  <video controls className="w-full mx-auto max-w-3xl rounded-lg">
                    <source src={responseData?.captionedVideoUrl} type="video/mp4" />
                    Your browser does not support the video tag.
                  </video>

                  {/* Video Details */}
                  <div className="moreinfo mx-4 md:mx-6 p-4 md:p-6 bg-white rounded-lg text-slate-950 border border-gray-200">
                    <p className="text-slate-800 text-lg mb-2">
                      <b>Name:</b> {responseData.fileName}
                    </p>

                    <p className="text-slate-800 text-lg mb-2">
                      <b>Subtitle Position:</b> {responseData.parameters?.subtitlePosition}
                    </p>
                    <p className="text-slate-800 text-lg mb-2">
                      <b>Font Size:</b> {responseData.parameters?.fontSize}
                    </p>
                    <p className="text-slate-800 text-lg mb-2">
                      <b>Font Style:</b> {responseData.parameters?.fontStyle}
                    </p>
                    <p className="text-slate-800 text-lg">
                      <b>Text Color:</b> {responseData.parameters?.textColor}
                    </p>

                    <p className="text-slate-800 text-lg mb-2">
                      <a
                        href={responseData.downloadLink}
                        download
                        className="mt-2 inline-block px-6 py-2 text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors"
                      >
                        Download Now
                      </a>
                    </p>
                  </div>
                </div>
              </>
            ) : state.isUploading ? (
              <div className="text-gray-600 text-center w-full flex flex-col items-center">
                <LoaderCircle className="loader-circle mx-auto my-4" />
                <TypeAnimation
                  sequence={[
                    "Generating captions for your video...",
                    3000,
                    "Do not close the window...",
                    3000,
                    "It may take up to 2 minutes...",
                    3000,
                  ]}
                  wrapper="p"
                  cursor={true}
                  repeat={Infinity}
                  className="text-2xl mb-2"
                />
                <Progress className= 'mt-5 w-11/12' value={(step + 1) * 25} />

              </div>
            ) : (
              <div className="text-gray-400 text-center">
                <p className="text-2xl mb-2">Ready to Process</p>
                <p>Upload a video to get started</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mx-6">
        {previous?.map((video) => (
          <div key={video._id}>
            <hr />
            <div className="flex flex-col md:flex-row justify-around mb-2 space-y-4 md:space-y-0">
              {/* Original Video */}
              <div className="video1 grid w-full md:w-auto">
                <Label className="mx-4 md:mx-32 md:my-3 text-slate-900 text-lg font-semibold text-center md:text-left">
                  Original Video
                </Label>
                <video loading="lazy" controls className="w-4/5 md:w-3/5 mx-auto max-w-3xl rounded-lg">
                  <source src={video.originalVideoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>

              {/* Captioned Video */}
              <div className="video2 grid w-full md:w-auto">
                <Label className="mx-4 md:mx-32 md:my-3 text-slate-900 text-lg font-semibold text-center md:text-left">
                  Captioned Video
                </Label>
                <video loading="lazy" controls className="w-4/5 md:w-3/5 mx-auto max-w-3xl rounded-lg">
                  <source src={video.captionedVideoUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>

            {/* More Details Button */}
            <div className="text-center my-4">
              <VideoDetailsModal video={video} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
