export type ChatFileKind = "image" | "text";

export type PreparedChatFile = {
  id: string;
  name: string;
  mime: string;
  kind: ChatFileKind;
  dataUrl?: string;
  text?: string;
};

const MAX_FILES = 6;
const MAX_PDF_PAGES = 3;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_PDF_BYTES = 12 * 1024 * 1024;
const MAX_TEXT_BYTES = 200 * 1024;
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function isImageFile(file: File) {
  if (IMAGE_TYPES.has(file.type) || file.type.startsWith("image/")) return true;
  if (!file.type && /\.(png|jpe?g|webp|gif|bmp)$/i.test(file.name)) return true;
  if (!file.type && /^image\./i.test(file.name)) return true;
  return false;
}

function isPdfFile(file: File) {
  if (file.type === "application/pdf") return true;
  return /\.pdf$/i.test(file.name);
}

function screenshotName(type: string) {
  const ext = type.includes("jpeg") ? "jpg" : type.split("/")[1] || "png";
  return `截屏.${ext}`;
}

function keyForFile(file: File) {
  return `${file.name}:${file.size}:${file.type}:${file.lastModified}`;
}

function isTextFile(file: File) {
  if (file.type.startsWith("text/")) return true;
  if (file.type === "application/json") return true;
  return /\.(txt|md|csv|json)$/i.test(file.name);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsDataURL(file);
  });
}

function readAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error("读取文件失败"));
    reader.readAsArrayBuffer(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("图片无法打开"));
    image.src = src;
  });
}

async function compressImage(file: File): Promise<string> {
  const raw = await readAsDataUrl(file);
  const image = await loadImage(raw);
  const maxEdge = 2048;
  const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;
  ctx.drawImage(image, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", 0.92);
}

function canvasToJpeg(canvas: HTMLCanvasElement, quality = 0.92) {
  return canvas.toDataURL("image/jpeg", quality);
}

/** 把 PDF 前几页渲成图片，便于看图模型审合同/发票 */
async function pdfToImageFiles(
  file: File,
  remainingSlots: number
): Promise<{ files: PreparedChatFile[]; notice?: string; error?: string }> {
  if (remainingSlots <= 0) {
    return { files: [], error: `一次最多 ${MAX_FILES} 个文件（含 PDF 页）` };
  }
  if (file.size > MAX_PDF_BYTES) {
    return { files: [], error: `${file.name} 超过 12MB，请拆页或压缩后再传` };
  }

  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();

    const data = await readAsArrayBuffer(file);
    const doc = await pdfjs.getDocument({ data }).promise;
    const pageCount = Math.min(doc.numPages, MAX_PDF_PAGES, remainingSlots);
    const files: PreparedChatFile[] = [];
    const base = file.name.replace(/\.pdf$/i, "") || "文档";

    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      const page = await doc.getPage(pageNum);
      const unscaled = page.getViewport({ scale: 1 });
      const scale = Math.min(2, 2048 / Math.max(unscaled.width, unscaled.height));
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      const ctx = canvas.getContext("2d");
      if (!ctx) continue;
      await page.render({ canvasContext: ctx, viewport }).promise;
      files.push({
        id: `${Date.now()}-${base}-p${pageNum}-${Math.random().toString(16).slice(2)}`,
        name: `${base}-第${pageNum}页.jpg`,
        mime: "image/jpeg",
        kind: "image",
        dataUrl: canvasToJpeg(canvas),
      });
    }

    if (!files.length) {
      return { files: [], error: "PDF 打不开或没有可渲染的页面" };
    }

    const notice =
      doc.numPages > pageCount
        ? `已将「${file.name}」前 ${pageCount} 页转成图片发送（共 ${doc.numPages} 页）。更多页请另传或拍照分页。`
        : `已将「${file.name}」共 ${pageCount} 页转成图片发送。`;

    return { files, notice };
  } catch {
    return {
      files: [],
      error: "PDF 解析失败。可改成拍照/截图（jpg/png），或拆成更小的 PDF 再试",
    };
  }
}

export async function prepareChatFiles(
  incoming: File[],
  existingCount: number
): Promise<{ files: PreparedChatFile[]; error?: string; notice?: string }> {
  if (incoming.length === 0) return { files: [] };

  const files: PreparedChatFile[] = [];
  let notice: string | undefined;

  for (const file of incoming) {
    const slotsLeft = MAX_FILES - existingCount - files.length;
    if (slotsLeft <= 0) {
      return { files: [], error: `一次最多 ${MAX_FILES} 个文件（PDF 每页占 1 个）` };
    }

    if (isPdfFile(file)) {
      const rendered = await pdfToImageFiles(file, slotsLeft);
      if (rendered.error && !rendered.files.length) {
        return { files: [], error: rendered.error };
      }
      files.push(...rendered.files);
      if (rendered.notice) notice = rendered.notice;
      continue;
    }

    const treatAsImage = isImageFile(file);
    if (treatAsImage || !isTextFile(file)) {
      if (treatAsImage && file.size > MAX_IMAGE_BYTES) {
        return { files: [], error: `${file.name || "截屏"} 超过 4MB` };
      }
      try {
        const dataUrl = await compressImage(file);
        files.push({
          id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
          name: file.name && file.name !== "blob" ? file.name : "截屏.jpg",
          mime: "image/jpeg",
          kind: "image",
          dataUrl,
        });
        continue;
      } catch {
        if (treatAsImage) {
          return { files: [], error: "截屏图片打不开，请再复制一次" };
        }
      }
    }
    if (isTextFile(file)) {
      if (file.size > MAX_TEXT_BYTES) {
        return { files: [], error: `${file.name} 超过 200KB` };
      }
      files.push({
        id: `${Date.now()}-${file.name}-${Math.random().toString(16).slice(2)}`,
        name: file.name,
        mime: file.type || "text/plain",
        kind: "text",
        text: await file.text(),
      });
      continue;
    }
    return {
      files: [],
      error: "只支持图片（jpg/png/webp）、PDF（自动转前几页）和文本（txt/md/csv/json）",
    };
  }

  if (existingCount + files.length > MAX_FILES) {
    return { files: [], error: `一次最多 ${MAX_FILES} 个文件（PDF 每页占 1 个）` };
  }
  return { files, notice };
}

export function filesFromClipboard(data: DataTransfer | null | undefined): File[] {
  if (!data) return [];
  const files: File[] = [];
  const seen = new Set<string>();
  const push = (file: File | null) => {
    if (!file || file.size === 0) return;
    const key = keyForFile(file);
    if (seen.has(key)) return;
    seen.add(key);
    if (file.name && file.name !== "blob") {
      files.push(file);
      return;
    }
    files.push(
      new File([file], screenshotName(file.type || "image/png"), {
        type: file.type || "image/png",
        lastModified: file.lastModified,
      })
    );
  };

  for (const file of Array.from(data.files || [])) push(file);
  for (const item of Array.from(data.items || [])) {
    if (item.kind === "file" || item.type.startsWith("image/")) {
      push(item.getAsFile());
    }
  }
  return files;
}

async function dataUrlToFile(dataUrl: string): Promise<File | null> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    if (!blob.size) return null;
    return new File([blob], screenshotName(blob.type || "image/png"), {
      type: blob.type || "image/png",
    });
  } catch {
    return null;
  }
}

export async function readClipboardImages(): Promise<File[]> {
  if (!navigator.clipboard?.read) return [];
  try {
    const items = await navigator.clipboard.read();
    const files: File[] = [];
    for (const item of items) {
      const type = item.types.find((value) => value.startsWith("image/"));
      if (!type) continue;
      const blob = await item.getType(type);
      files.push(new File([blob], screenshotName(type), { type }));
    }
    return files;
  } catch {
    return [];
  }
}

export async function filesFromPasteEvent(event: ClipboardEvent): Promise<File[]> {
  const fromEvent = filesFromClipboard(event.clipboardData);
  if (fromEvent.length) return fromEvent;

  const html = event.clipboardData?.getData("text/html") || "";
  const src = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1];
  if (src?.startsWith("data:image/") || src?.startsWith("blob:")) {
    const file = await dataUrlToFile(src);
    if (file) return [file];
  }

  return readClipboardImages();
}
