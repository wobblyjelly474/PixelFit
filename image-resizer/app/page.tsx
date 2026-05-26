"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import Cropper from "react-easy-crop";

import {
  Upload,
  FolderOpen,
  Download,
  ImageIcon,
  Crop,
  X,
} from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [originalFiles, setOriginalFiles] =
    useState<File[]>([]);
  const [folderName, setFolderName] =
    useState("");
  const [aspect, setAspect] = useState("4:3");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] =
    useState(false);

  const [processedCount, setProcessedCount] =
    useState(0);

  // upload type
  const [uploadType, setUploadType] = useState<
    "individual" | "folder" | null
  >(null);

  // mode
  const [individualMode, setIndividualMode] =
    useState<"padding" | "crop">(
      "padding"
    );

  // crop modal
  const [editingImage, setEditingImage] =
    useState<string | null>(null);

  const [editingIndex, setEditingIndex] =
    useState<number | null>(null);

  const [crop, setCrop] = useState({
    x: 0,
    y: 0,
  });

  const [zoom, setZoom] = useState(1);

  const [croppedAreaPixels, setCroppedAreaPixels] =
    useState<any>(null);

  const aspectMap: any = {
    "1:1": [1, 1],
    "4:3": [4, 3],
    "16:9": [16, 9],
    "9:16": [9, 16],
  };

  const [ratioW, ratioH] =
    aspectMap[aspect];

  const handleIndividualUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    setUploadType("individual");

    setFiles(
      Array.from(e.target.files)
    );
    setOriginalFiles(Array.from(e.target.files));
  };

  const handleFolderUpload = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    setUploadType("folder");

    setFiles(
      Array.from(e.target.files)
    );
    
    const firstFile =
      e.target.files[0];

    if (firstFile.webkitRelativePath) {
      const folder =
        firstFile.webkitRelativePath.split("/")[0];

      setFolderName(folder);
    }
    setOriginalFiles(Array.from(e.target.files));
  };

  const handleDrop = (
    e: React.DragEvent<HTMLDivElement>
  ) => {
    e.preventDefault();

    setDragging(false);

    const droppedFiles = Array.from(
      e.dataTransfer.files
    );

    if (droppedFiles.length === 0) return;

    setUploadType("individual");
    const imageFiles = droppedFiles.filter((file) =>
      file.type.startsWith("image/")
    );

    setFiles((prev) => [
      ...prev,
      ...imageFiles,
    ]);
  };

  const processImages = async () => {
    if (files.length === 0) return;

    setProcessing(true);

    const zip = new JSZip();

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const imageURL =
        URL.createObjectURL(file);

      const img = await loadImage(
        imageURL
      );

      const targetWidth = 1800;

      const targetHeight =
        (targetWidth * ratioH) / ratioW;

      const canvas =
        document.createElement("canvas");

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx =
        canvas.getContext("2d");

      if (!ctx) continue;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality =
        "high";

      // white background
      ctx.fillStyle = "white";

      ctx.fillRect(
        0,
        0,
        targetWidth,
        targetHeight
      );

      // ALWAYS fit/padding
      const scale = Math.min(
        targetWidth / img.width,
        targetHeight / img.height
      );

      const newWidth =
        img.width * scale;

      const newHeight =
        img.height * scale;

      const x =
        (targetWidth - newWidth) / 2;

      const y =
        (targetHeight - newHeight) / 2;

      ctx.drawImage(
        img,
        x,
        y,
        newWidth,
        newHeight
      );

      const blob: Blob | null =
        await new Promise((resolve) =>
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.95
          )
        );

      if (!blob) continue;

      const originalName =
        file.name.split(".")[0];

      const cleanAspect =
        aspect.replace(":", "x");

      const exportName =
        `${originalName}_${cleanAspect}_pixelfit.jpg`;

      zip.file(exportName, blob);

      URL.revokeObjectURL(imageURL);
      const percent = Math.round(
        ((i + 1) / files.length) * 100
      );
      setProgress(percent);
      setProcessedCount(i + 1);
    }

    const content =
      await zip.generateAsync({
        type: "blob",
      });

    saveAs(
      content,
      uploadType === "folder"
        ? `${folderName}-resized.zip`
        : `pixelfit-${aspect.replace(":", "x")}.zip`
    );
    
    setProgress(0);
    setProcessedCount(0);
    setProcessing(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-6">

      <div
        className={`w-full max-w-6xl bg-white rounded-3xl shadow-2xl p-8 flex flex-col gap-8 transition-all duration-300 ${
        dragging
          ? "border-4 border-blue-500 scale-[1.01]"
          : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() =>
          setDragging(false)
        }
        onDrop={handleDrop}
      >

        {/* Header */}
        <div className="text-center space-y-3">

          <h1 className="text-5xl font-bold text-slate-800">
            PixelFit
          </h1>

          <p className="text-slate-500 text-lg">
            Bulk image resizer with
            smart padding.
          </p>
        </div>

        {dragging && (
          <div className="text-center text-blue-600 font-semibold text-lg animate-pulse">

            Drop images here ✨
          </div>
        )}

        <p className="text-sm text-slate-500 text-center">
          Drag and drop images here or use the upload buttons below.(folders via Upload Folder)
        </p>

        {/* Upload Buttons */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Individual Upload */}
          <label className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-black transition bg-slate-50">

            <Upload className="w-12 h-12 text-slate-600" />

            <div className="text-center">

              <p className="text-xl font-semibold text-slate-700">
                Upload Images
              </p>

              <p className="text-slate-500 text-sm">
                Individual image editing
              </p>
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={
                handleIndividualUpload
              }
              className="hidden"
            />
          </label>

          {/* Folder Upload */}
          <label className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-black transition bg-slate-50">

            <FolderOpen className="w-12 h-12 text-slate-600" />

            <div className="text-center">

              <p className="text-xl font-semibold text-slate-700">
                Upload Folder
              </p>

              <p className="text-slate-500 text-sm">
                Fast bulk processing
              </p>
            </div>

            <input
              type="file"
              multiple
              onChange={
                handleFolderUpload
              }
              className="hidden"
              {...({
                webkitdirectory: "",
              } as any)}
            />
          </label>
        </div>

        {/* Aspect Ratios */}
        <div className="flex flex-wrap gap-4 justify-center">

          {[
            "1:1",
            "4:3",
            "16:9",
            "9:16",
          ].map((ratio) => (
            <button
              key={ratio}
              onClick={() =>
                setAspect(ratio)
              }
              className={`px-5 py-3 rounded-xl transition font-semibold ${
                aspect === ratio
                  ? "bg-black text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>

        {/* Individual Mode */}
        {uploadType ===
          "individual" && (
          <div className="flex justify-center gap-4">

            <button
              onClick={() =>
                setIndividualMode(
                  "padding"
                )
              }
              className={`px-5 py-3 rounded-xl font-semibold transition ${
                individualMode ===
                "padding"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              Smart Padding
            </button>

            <button
              onClick={() =>
                setIndividualMode(
                  "crop"
                )
              }
              className={`px-5 py-3 rounded-xl font-semibold transition ${
                individualMode ===
                "crop"
                  ? "bg-blue-600 text-white"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              Manual Crop
            </button>
          </div>
        )}

        {/* Preview Grid */}
        {uploadType ===
          "individual" &&
          individualMode ===
            "crop" &&
          files.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

              {files.map(
                (file, index) => {
                  const preview =
                    URL.createObjectURL(
                      file
                    );

                  return (
                    <div
                      key={index}
                      className="relative group rounded-2xl overflow-hidden bg-slate-100"
                    >

                      <button
                        onClick={() => {
                          setFiles((prev) =>
                            prev.filter((_, i) => i !== index)
                          );
                        }}
                        className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition"
                      >
                        ✕
                      </button>

                      <button
                        onClick={() => {
                          setFiles((prev) =>
                            prev.map((file, i) =>
                              i === index
                                ? originalFiles[index]
                                : file
                            )
                          );
                        }}
                        className="absolute top-12 right-2 z-10 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg transition"
                      >
                        ↺
                      </button>

                      <img
                        src={preview}
                        alt={file.name}
                        className="w-full h-52 object-cover"
                      />

                      <button
                        onClick={() => {
                          setEditingImage(preview);
                          setEditingIndex(index);
                        }}
                        className="absolute bottom-3 right-3 bg-black/70 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition"
                      >

                        <Crop className="w-5 h-5" />
                      </button>
                    </div>
                  );
                }
              )}
            </div>
          )}

        {/* File Count */}
        
        {files.length > 0 && (
          <div className="flex justify-center">
            <button
              onClick={() => {
                setFiles([]);
                setProgress(0);
                setProcessedCount(0);
                setUploadType(null);
              }}
              className="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition"
            >
              Clear All
            </button>
          </div>
)}


        <div className="flex items-center justify-center gap-3 text-slate-600">

          <ImageIcon className="w-5 h-5" />

          <p>
            {files.length} image(s)
            selected
          </p>
        </div>
        {processing && (
          <div className="w-full max-w-xl mx-auto flex flex-col gap-3">

            <div className="flex justify-between text-sm text-slate-600">

              <span>
                Processing {processedCount} / {files.length}
              </span>

              <span>{progress}%</span>
            </div>

            <div className="w-full h-4 bg-slate-200 rounded-full overflow-hidden">

              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>
          </div>
)}
        
              {/* Process Button */}
        <div className="flex justify-center">

          <button
            onClick={processImages}
            disabled={processing}
            className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-2xl text-lg font-semibold shadow-xl transition hover:scale-105 disabled:opacity-50"
          >

            <Download className="w-6 h-6" />

            {processing
              ? "Processing..."
              : "Process & Download ZIP"}
          </button>
        </div>
      </div>

      {/* Crop Modal */}
      {editingImage && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-6">

          <div className="bg-white rounded-3xl w-full max-w-3xl p-6 flex flex-col gap-6">

            <div className="flex items-center justify-between">

              <h2 className="text-2xl font-bold">
                Manual Crop
              </h2>

              <button
                onClick={() =>
                  setEditingImage(null)
                }
              >
                <X className="w-7 h-7" />
              </button>
            </div>

            <div className="relative w-full h-[500px] bg-slate-200 rounded-2xl overflow-hidden">

              <Cropper
                image={editingImage}
                crop={crop}
                zoom={zoom}
                aspect={ratioW / ratioH}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(
                  croppedArea,
                  croppedPixels
                ) => {
                  setCroppedAreaPixels(
                    croppedPixels
                  );
                }}
              />
            </div>

            <div className="flex flex-col gap-2">

              <label className="font-medium">
                Zoom
              </label>

              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) =>
                  setZoom(
                    Number(
                      e.target.value
                    )
                  )
                }
              />
            </div>

            <div className="flex justify-end gap-4">

              <button
                onClick={() =>
                  setEditingImage(null)
                }
                className="px-5 py-3 rounded-xl bg-slate-200 font-semibold"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (
                    !editingImage ||
                    !croppedAreaPixels
                  )
                    return;

                  const croppedBlob =
                    await getCroppedImg(
                      editingImage,
                      croppedAreaPixels
                    );

                  if (!croppedBlob)
                    return;

                  const croppedFile =
                    new File(
                      [croppedBlob],
                      "cropped.jpg",
                      {
                        type:
                          "image/jpeg",
                      }
                    );

                  setFiles((prev) =>
                    prev.map((file, i) =>
                      i === editingIndex
                        ? croppedFile
                        : file
                    )
                  );

                  setEditingImage(
                    null
                  );
                  setEditingIndex(null);
                }}
                className="px-5 py-3 rounded-xl bg-blue-600 text-white font-semibold"
              >
                Save Crop
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function loadImage(
  src: string
): Promise<HTMLImageElement> {
  return new Promise(
    (resolve, reject) => {
      const img = new Image();

      img.src = src;

      img.onload = () =>
        resolve(img);

      img.onerror = reject;
    }
  );
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: any
): Promise<Blob | null> {
  const image = await loadImage(
    imageSrc
  );

  const canvas =
    document.createElement("canvas");

  const ctx =
    canvas.getContext("2d");

  if (!ctx) return null;

  canvas.width = pixelCrop.width;

  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => resolve(blob),
      "image/jpeg",
      0.95
    );
  });
}