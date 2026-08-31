"use client";

import { useRef, useState } from "react";
import { Loader2, Upload } from "lucide-react";
import { AVATAR_PRESETS } from "@/lib/avatars";
import { UserAvatar } from "@/components/UserAvatar";
import { useLocale } from "@/hooks/useLocale";

type Props = {
  value: string;
  onChange: (url: string) => void;
  /** Show upload (account / logged-in). Register can enable after choosing preset. */
  allowUpload?: boolean;
  onUploaded?: (url: string) => void;
  compact?: boolean;
  /** When false, skip the large preview row (parent already shows one). */
  showHeader?: boolean;
};

export function AvatarPicker({
  value,
  onChange,
  allowUpload = false,
  onUploaded,
  compact = false,
  showHeader = true,
}: Props) {
  const { t } = useLocale();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const upload = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/avatars/upload", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.error || t("avatar.uploadFailed"));
        return;
      }
      const url =
        (data.avatarUrl as string) || (data.user?.avatarUrl as string);
      if (url) {
        onChange(url);
        onUploaded?.(url);
      }
    } catch {
      setUploadError(t("common.networkError"));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      {showHeader ? (
        <div className="flex items-center gap-3">
          <UserAvatar
            src={value}
            alt={t("avatar.preview")}
            size={compact ? 48 : 64}
          />
          <div className="min-w-0 flex-1">
            <p className="text-sm text-zinc-300">{t("avatar.choose")}</p>
            <p className="mt-0.5 text-xs text-zinc-500">{t("avatar.hint")}</p>
          </div>
        </div>
      ) : null}

      <div
        className={`grid gap-2 ${compact ? "grid-cols-6 sm:grid-cols-8" : "grid-cols-5 sm:grid-cols-8"}`}
        role="listbox"
        aria-label={t("avatar.presets")}
      >
        {AVATAR_PRESETS.map((preset) => {
          const selected = value === preset.url;
          return (
            <button
              key={preset.id}
              type="button"
              role="option"
              aria-selected={selected}
              onClick={() => onChange(preset.url)}
              className={`relative aspect-square overflow-hidden rounded-full ring-2 transition ${
                selected
                  ? "ring-[#7c5cff] ring-offset-2 ring-offset-[#14110e]"
                  : "ring-transparent hover:ring-white/25"
              }`}
            >
              <UserAvatar
                src={preset.url}
                alt={preset.id}
                size={compact ? 40 : 48}
                className="h-full w-full"
              />
            </button>
          );
        })}
      </div>

      {allowUpload && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void upload(file);
            }}
          />
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-lg border border-white/12 bg-white/5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/10 disabled:opacity-50"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
            {uploading ? t("avatar.uploading") : t("avatar.upload")}
          </button>
          <p className="mt-1.5 text-xs text-zinc-500">{t("avatar.uploadHint")}</p>
          {uploadError && (
            <p className="mt-1 text-sm text-red-400">{uploadError}</p>
          )}
        </div>
      )}
    </div>
  );
}
