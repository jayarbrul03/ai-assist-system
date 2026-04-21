"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Upload, Loader2, CheckCircle2, FileText } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface BylawDoc {
  id: string;
  title: string;
  source_type: string | null;
  created_at: string;
}

export function BylawsLibrary({
  schemeId,
  documents,
  chunkCount,
}: {
  schemeId: string;
  documents: BylawDoc[];
  chunkCount: number;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ chunks: number; pages: number } | null>(
    null,
  );

  async function onUpload() {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Pick a PDF first.");
      return;
    }
    if (file.type !== "application/pdf") {
      setError("Only PDFs are supported.");
      return;
    }

    setUploading(true);
    setError(null);
    setResult(null);
    setStatus("Uploading…");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("schemeId", schemeId);
      form.append("title", file.name);

      setStatus("Parsing provisions…");
      const res = await fetch("/api/ingest", { method: "POST", body: form });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setResult({ chunks: j.chunks, pages: j.pages });
      setStatus(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setStatus(null);
    } finally {
      setUploading(false);
    }
  }

  return (
    <Card id="bylaws">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-teal-50 text-teal-700 shrink-0">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>By-laws library</CardTitle>
              <CardDescription className="mt-1">
                Upload your scheme&apos;s registered by-laws (PDF). Parity parses each
                provision, indexes it, and Rulebook AI answers from those
                citations.
              </CardDescription>
            </div>
          </div>
          <Badge variant={chunkCount > 0 ? "success" : "secondary"}>
            {chunkCount > 0 ? `${chunkCount} provisions indexed` : "Not loaded"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {documents.length > 0 ? (
          <ul className="divide-y divide-neutral-100 border border-neutral-200 rounded-lg">
            {documents.map((d) => (
              <li
                key={d.id}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-neutral-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{d.title}</p>
                    <p className="text-xs text-neutral-500">
                      Uploaded {formatDate(d.created_at)}
                      {d.source_type ? ` · ${d.source_type}` : ""}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm text-neutral-600">
            <p className="font-medium text-neutral-800">
              No by-laws uploaded yet.
            </p>
            <p className="mt-1">
              Until you upload, Parity answers from general Queensland BCCM
              knowledge — helpful, but not scheme-specific. Upload the
              registered by-laws (usually on the CMS filing) to get
              citation-grade answers.
            </p>
          </div>
        )}

        <label
          htmlFor="bylaws-file"
          className="flex items-center justify-center h-24 border-2 border-dashed border-neutral-300 rounded-lg cursor-pointer hover:bg-teal-50/30 hover:border-teal-300 transition"
        >
          <div className="flex flex-col items-center gap-1.5 text-sm text-neutral-600">
            <Upload className="h-5 w-5" />
            <span>Click to select a PDF</span>
            <span className="text-xs text-neutral-400">
              Typically the registered CMS by-laws, 20–60 pages
            </span>
          </div>
          <input
            id="bylaws-file"
            ref={fileRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={() => {
              setError(null);
              setResult(null);
            }}
          />
        </label>

        {status ? (
          <p className="text-sm text-teal-700 flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> {status}
          </p>
        ) : null}
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
        {result ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-sm">
            <p className="flex items-center gap-2 text-teal-800 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              Indexed {result.chunks} provisions across {result.pages} pages.
            </p>
            <p className="text-xs text-teal-700 mt-1">
              Rulebook AI can now answer from your scheme&apos;s exact by-laws.
            </p>
          </div>
        ) : null}
      </CardContent>

      <CardFooter>
        <Button onClick={onUpload} disabled={uploading}>
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4" /> Upload by-laws
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
