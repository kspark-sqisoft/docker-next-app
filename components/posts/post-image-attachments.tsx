"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const MAX_IMAGES = 5;

type Props = {
  imageUrls: string[];
  onChange: (urls: string[]) => void;
  disabled?: boolean;
  className?: string;
  onBusyChange?: (busy: boolean) => void;
};

export function PostImageAttachments({
  imageUrls,
  onChange,
  disabled,
  className,
  onBusyChange,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onBusyChange?.(uploading);
  }, [uploading, onBusyChange]);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (imageUrls.length >= MAX_IMAGES) {
      setError(`이미지는 최대 ${MAX_IMAGES}장입니다.`);
      return;
    }
    setError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const res = await fetch("/api/posts/images", {
        method: "POST",
        body,
      });
      const data = (await res.json().catch(() => ({}))) as {
        url?: string;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? "업로드 실패");
      }
      if (!data.url) throw new Error("업로드 실패");
      onChange([...imageUrls, data.url]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  }

  function removeAt(index: number) {
    onChange(imageUrls.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => void handleFileChange(e)}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={
            disabled || uploading || imageUrls.length >= MAX_IMAGES
          }
          className="gap-1.5"
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <ImagePlus className="size-3.5" aria-hidden />
          )}
          이미지 추가
        </Button>
        <span className="text-muted-foreground text-xs">
          jpeg, png, webp, gif · 최대 {MAX_IMAGES}장 · 파일당 5MB
        </span>
      </div>
      {error ? (
        <p className="text-destructive text-xs" role="alert">
          {error}
        </p>
      ) : null}
      {imageUrls.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {imageUrls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="relative overflow-hidden rounded-lg ring-1 ring-border"
            >
              <img
                src={url}
                alt=""
                className="bg-muted/40 aspect-video max-h-48 w-full object-contain"
              />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="absolute right-2 top-2 size-8 opacity-90 shadow-sm"
                disabled={disabled || uploading}
                onClick={() => removeAt(i)}
                aria-label="이미지 제거"
              >
                <X className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
