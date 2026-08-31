import { extractText } from "unpdf";
import { resolveServiceBase } from "@/lib/integrations/feature-flags";

export type DocExtractResult = {
  text: string;
  pages?: number;
  engine: "unpdf" | "worker";
};

/** 服务端抽 PDF 文本。可选用 DOCLING 旁路（账户开关 / env）。 */
export async function extractDocumentText(
  bytes: ArrayBuffer | Uint8Array,
  filename = "document.pdf"
): Promise<DocExtractResult> {
  const worker = await resolveServiceBase("docling");
  if (worker) {
    try {
      const form = new FormData();
      const buffer =
        bytes instanceof Uint8Array ? Buffer.from(bytes) : Buffer.from(bytes);
      form.append(
        "file",
        new Blob([buffer], { type: "application/pdf" }),
        filename
      );
      const res = await fetch(`${worker.replace(/\/$/, "")}/extract`, {
        method: "POST",
        body: form,
      });
      if (res.ok) {
        const data = (await res.json()) as { text?: string; pages?: number };
        if (data.text?.trim()) {
          return {
            text: data.text.trim().slice(0, 80_000),
            pages: data.pages,
            engine: "worker",
          };
        }
      }
    } catch {
      /* fall through to unpdf */
    }
  }

  const data =
    bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const result = await extractText(data, { mergePages: true });
  const text = (
    Array.isArray(result.text) ? result.text.join("\n") : result.text || ""
  )
    .replace(/\s+\n/g, "\n")
    .trim();
  return {
    text: text.slice(0, 80_000),
    pages: result.totalPages,
    engine: "unpdf",
  };
}
