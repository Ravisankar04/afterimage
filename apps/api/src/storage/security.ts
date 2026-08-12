import { extname } from "node:path";
import { fileTypeFromBuffer } from "file-type";
import { config } from "../config.js";

/** Executable / dangerous MIME types — always reject regardless of extension. */
const BLOCKED_MIME = new Set([
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-sharedlib",
  "application/x-mach-binary",
  "application/vnd.microsoft.portable-executable",
  "application/x-sh",
  "application/x-csh",
  "application/javascript",
  "text/javascript",
  "application/x-httpd-php",
  "application/java-archive",
]);

const BLOCKED_EXTENSIONS = new Set([
  ".exe",
  ".dll",
  ".bat",
  ".cmd",
  ".com",
  ".msi",
  ".scr",
  ".ps1",
  ".sh",
  ".bash",
  ".php",
  ".phtml",
  ".asp",
  ".aspx",
  ".jsp",
  ".cgi",
  ".jar",
  ".wasm",
  ".so",
  ".dylib",
]);

const EXT_TO_MIME: Record<string, string[]> = {
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
  ".mp4": ["video/mp4"],
  ".webm": ["video/webm"],
  ".mov": ["video/quicktime"],
  ".mp3": ["audio/mpeg"],
  ".wav": ["audio/wav", "audio/x-wav", "audio/wave"],
  ".pdf": ["application/pdf"],
  ".txt": ["text/plain"],
  ".json": ["application/json", "text/plain"],
};

export type UploadValidationResult =
  | {
      ok: true;
      extension: string;
      detectedMime: string;
      safeFilename: string;
    }
  | {
      ok: false;
      reason: string;
      code: string;
    };

/**
 * Validate upload: extension allowlist, magic-byte MIME, size, path traversal, executables.
 * Do NOT trust browser-provided MIME types.
 */
export async function validateUpload(input: {
  originalFilename: string;
  buffer: Buffer;
  claimedMime?: string;
  maxBytes?: number;
}): Promise<UploadValidationResult> {
  const maxBytes = input.maxBytes ?? config.MAX_UPLOAD_SIZE;
  const rawName = input.originalFilename || "upload";

  if (rawName.includes("\0") || rawName.includes("..") || /[/\\]/.test(rawName)) {
    return { ok: false, reason: "Path traversal or invalid filename rejected", code: "PATH_TRAVERSAL" };
  }

  if (input.buffer.byteLength === 0) {
    return { ok: false, reason: "Empty file", code: "EMPTY_FILE" };
  }

  if (input.buffer.byteLength > maxBytes) {
    return {
      ok: false,
      reason: `File exceeds max size of ${maxBytes} bytes`,
      code: "FILE_TOO_LARGE",
    };
  }

  const extension = extname(rawName).toLowerCase();
  if (!extension || !config.allowedExtensions.has(extension)) {
    return { ok: false, reason: `Extension not allowed: ${extension || "(none)"}`, code: "EXTENSION_DENIED" };
  }

  if (BLOCKED_EXTENSIONS.has(extension)) {
    return { ok: false, reason: "Executable / dangerous extension rejected", code: "EXECUTABLE_DENIED" };
  }

  const detected = await fileTypeFromBuffer(input.buffer);
  // text/json may have no magic bytes
  const textLike = extension === ".txt" || extension === ".json";
  const detectedMime = detected?.mime ?? (textLike ? (extension === ".json" ? "application/json" : "text/plain") : null);

  if (!detectedMime) {
    return { ok: false, reason: "Unable to detect file type from magic bytes", code: "MIME_UNKNOWN" };
  }

  if (BLOCKED_MIME.has(detectedMime)) {
    return { ok: false, reason: `Blocked MIME type: ${detectedMime}`, code: "MIME_BLOCKED" };
  }

  const allowedForExt = EXT_TO_MIME[extension];
  if (allowedForExt && !allowedForExt.includes(detectedMime) && !textLike) {
    return {
      ok: false,
      reason: `MIME mismatch: extension ${extension} but detected ${detectedMime}`,
      code: "MIME_MISMATCH",
    };
  }

  // Ignore claimed MIME entirely for trust decisions; only log mismatch
  void input.claimedMime;

  const safeFilename = rawName.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 180);

  return {
    ok: true,
    extension,
    detectedMime,
    safeFilename,
  };
}
