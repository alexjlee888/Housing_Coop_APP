"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";

type Document = {
  id: string;
  fileName: string;
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentUploader({
  regulationId,
  buildingId,
  initialDocuments,
  canEdit,
}: {
  regulationId: string;
  buildingId: string;
  initialDocuments: Document[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>(initialDocuments);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `/api/buildings/${buildingId}/regulations/${regulationId}/documents`,
      { method: "POST", body: formData }
    );

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Upload failed.");
    } else {
      const doc = await res.json();
      setDocuments((d) => [...d, doc]);
      router.refresh();
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(docId: string) {
    const res = await fetch(
      `/api/buildings/${buildingId}/regulations/${regulationId}/documents/${docId}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setDocuments((d) => d.filter((doc) => doc.id !== docId));
      router.refresh();
    }
  }

  return (
    <div className="space-y-3">
      {documents.length === 0 && (
        <p className="text-sm text-muted-foreground">No attachments yet.</p>
      )}

      {documents.map((doc) => (
        <div key={doc.id} className="flex items-center gap-3">
          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
          <a
            href={doc.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-0 text-sm underline underline-offset-2 truncate hover:text-foreground"
          >
            {doc.fileName}
          </a>
          <span className="text-xs text-muted-foreground shrink-0">
            {formatBytes(doc.sizeBytes)}
          </span>
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(doc.id)}
              className="shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          )}
        </div>
      ))}

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      {canEdit && (
        <>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.txt"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading...</>
            ) : (
              <><Upload className="w-3.5 h-3.5" /> Attach File</>
            )}
          </Button>
        </>
      )}
    </div>
  );
}
