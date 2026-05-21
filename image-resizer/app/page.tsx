"use client";

import { useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  Upload,
  FolderOpen,
  Download,
  ImageIcon,
} from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [aspect, setAspect] = useState("4:3");
  const [processing, setProcessing] = useState(false);

  const aspectMap: any = {
    "1:1": [1, 1],
    "4:3": [4, 3],
    "16:9": [16, 9],
    "9:16": [9, 16],
  };

  const handleFiles = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
  };

  const processImages = async () => {
    if (files.length === 0) return;

    setProcessing(true);

    const zip = new JSZip();

    const [ratioW, ratioH] = aspectMap[aspect];

    for (const file of files) {
      const imageURL = URL.createObjectURL(file);

      const img = await loadImage(imageURL);

      const targetWidth = 1200;
      const targetHeight =
        (targetWidth * ratioH) / ratioW;

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");

      if (!ctx) continue;

      // White background
      ctx.fillStyle = "white";
      ctx.fillRect(
        0,
        0,
        targetWidth,
        targetHeight
      );

      // Fit image inside canvas
      const scale = Math.min(
        targetWidth / img.width,
        targetHeight / img.height
      );

      const newWidth = img.width * scale;
      const newHeight = img.height * scale;

      const x = (targetWidth - newWidth) / 2;
      const y = (targetHeight - newHeight) / 2;

      ctx.drawImage(
        img,
        x,
        y,
        newWidth,
        newHeight
      );

      const blob: Blob | null = await new Promise(
        (resolve) =>
          canvas.toBlob(
            resolve,
            "image/jpeg",
            0.95
          )
      );

      if (!blob) continue;

      zip.file(
        `${file.name.split(".")[0]}.jpg`,
        blob
      );
    }

    const content = await zip.generateAsync({
      type: "blob",
    });

    saveAs(content, "resized-images.zip");

    setProcessing(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-100 via-white to-slate-200 flex items-center justify-center p-6">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-8 flex flex-col gap-8">

        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-bold text-slate-800">
            PixelFit
          </h1>

          <p className="text-slate-500 text-lg">
            Bulk image resizer with smart padding.
          </p>
        </div>

        {/* Upload Buttons */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Multiple Images */}
          <label className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-black transition bg-slate-50">

            <Upload className="w-12 h-12 text-slate-600" />

            <div className="text-center">
              <p className="text-xl font-semibold text-slate-700">
                Upload Images
              </p>

              <p className="text-slate-500 text-sm">
                Select multiple images
              </p>
            </div>

            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFiles}
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
                Process entire folder
              </p>
            </div>

            <input
              type="file"
              multiple
              onChange={handleFiles}
              className="hidden"
            {...({ webkitdirectory: "" } as any)}
            />
          </label>
        </div>

        {/* Ratio Selection */}
        <div className="flex flex-wrap gap-4 justify-center">

          {["1:1", "4:3", "16:9", "9:16"].map(
            (ratio) => (
              <button
                key={ratio}
                onClick={() => setAspect(ratio)}
                className={`px-5 py-3 rounded-xl transition font-semibold ${
                  aspect === ratio
                    ? "bg-black text-white"
                    : "bg-slate-200 text-slate-700"
                }`}
              >
                {ratio}
              </button>
            )
          )}
        </div>

        {/* File Count */}
        <div className="flex items-center justify-center gap-3 text-slate-600">

          <ImageIcon className="w-5 h-5" />

          <p>
            {files.length} image(s) selected
          </p>
        </div>

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
    </main>
  );
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.src = src;

    img.onload = () => resolve(img);

    img.onerror = reject;
  });
}