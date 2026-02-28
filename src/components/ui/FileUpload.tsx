"use client";

import { useCallback, useState } from "react";
import { Upload, X, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  folder?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded: (paths: string[]) => void;
  existingPaths?: string[];
  label?: string;
  hint?: string;
}

export function FileUpload({
  folder = "general",
  accept = "image/*",
  multiple = true,
  onUploaded,
  existingPaths = [],
  label = "Déposer des fichiers",
  hint,
}: FileUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [paths, setPaths] = useState<string[]>(existingPaths);

  const upload = useCallback(
    async (files: FileList) => {
      setUploading(true);
      const newPaths: string[] = [];

      for (const file of Array.from(files)) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", folder);

        const res = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.path) {
          newPaths.push(data.path);
        }
      }

      const updated = multiple ? [...paths, ...newPaths] : newPaths;
      setPaths(updated);
      onUploaded(updated);
      setUploading(false);
    },
    [folder, multiple, onUploaded, paths]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        upload(e.dataTransfer.files);
      }
    },
    [upload]
  );

  const removePath = (pathToRemove: string) => {
    const updated = paths.filter((p) => p !== pathToRemove);
    setPaths(updated);
    onUploaded(updated);
  };

  const isImage = (p: string) =>
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(p);

  return (
    <div className="space-y-3">
      {/* Drop Zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragOver
            ? "border-purple-400 bg-purple-50"
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = accept;
          input.multiple = multiple;
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) upload(files);
          };
          input.click();
        }}
      >
        <Upload className="mx-auto h-8 w-8 text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 font-medium">{label}</p>
        {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
        {uploading && (
          <p className="text-xs text-purple-600 mt-2 animate-pulse">
            Téléversement en cours…
          </p>
        )}
      </div>

      {/* Preview */}
      {paths.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {paths.map((p) => (
            <div key={p} className="relative group">
              {isImage(p) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p}
                  alt=""
                  className="h-24 w-full object-cover rounded-lg border border-gray-200"
                />
              ) : (
                <div className="h-24 w-full flex flex-col items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                  <FileIcon className="h-8 w-8 text-gray-400" />
                  <p className="text-xs text-gray-500 mt-1 truncate max-w-full px-1">
                    {p.split("/").pop()}
                  </p>
                </div>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removePath(p);
                }}
                className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3 text-gray-600" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
