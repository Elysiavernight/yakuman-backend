import { S3Client } from "bun";
import sharp from "sharp";

export type ImageKind = "avatars" | "screenshots";
export class ImageError extends Error {}
const marker = "r2:";
const publicBase = () => process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
export function imageUrl(value: string, kind: ImageKind, id: string): string {
  if (!value) return "";
  if (value.startsWith(marker)) {
    if (!publicBase())
      throw new Error("R2_PUBLIC_URL is required for stored images.");
    return `${publicBase()}/${value.slice(marker.length)}`;
  }
  const version = value.startsWith("legacy:")
    ? value.slice(7)
    : String(value.length);
  return `${process.env.API_PUBLIC_URL?.replace(/\/$/, "") ?? ""}/api/images/${kind}/${encodeURIComponent(id)}?v=${version}`;
}

export function imageThumbnail(value: string, id: string) {
  return value.startsWith("r2:screenshots/")
    ? imageUrl(
        value.replace("r2:screenshots/", "r2:thumbnails/"),
        "screenshots",
        id,
      )
    : imageUrl(value, "screenshots", id);
}

export function r2Client() {
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET } =
    process.env;
  if (
    !R2_ENDPOINT ||
    !R2_ACCESS_KEY_ID ||
    !R2_SECRET_ACCESS_KEY ||
    !R2_BUCKET ||
    !publicBase()
  ) {
    throw new ImageError(
      "Image storage is not configured. Ask the owner to configure R2.",
    );
  }
  return new S3Client({
    endpoint: R2_ENDPOINT,
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
    bucket: R2_BUCKET,
    region: "auto",
  });
}

export function decodeImage(value: string) {
  const match =
    /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match || value.length > 7_000_000)
    throw new ImageError("Choose a PNG, JPEG, GIF or WebP image under 5 MB.");
  const bytes = Buffer.from(match[2]!, "base64");
  if (bytes.length > 5 * 1024 * 1024)
    throw new ImageError("Choose an image under 5 MB.");
  return { bytes, type: `image/${match[1]}` };
}

export interface ImageStore {
  write(
    key: string,
    bytes: Buffer,
    options: { type: string },
  ): Promise<unknown>;
  file(key: string): { arrayBuffer(): Promise<ArrayBuffer> };
}

export async function storeImage(
  value: string,
  kind: ImageKind,
  storage?: ImageStore,
): Promise<string> {
  const { bytes } = decodeImage(value);
  let optimized: Buffer;
  try {
    optimized = await sharp(bytes, { limitInputPixels: 40_000_000 })
      .rotate()
      .resize({
        width: kind === "avatars" ? 512 : 2400,
        height: kind === "avatars" ? 512 : 2400,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: kind === "avatars" ? 85 : 90 })
      .toBuffer();
  } catch {
    throw new ImageError(
      "That image could not be decoded. Choose another image.",
    );
  }
  const hash = new Bun.CryptoHasher("sha256").update(optimized).digest("hex");
  const key = `${kind}/${hash}.webp`;
  const client = storage ?? r2Client();
  const upload = async (objectKey: string, bytes: Buffer) => {
    await client.write(objectKey, bytes, { type: "image/webp" });
    // Verify the bytes before allowing the database to replace the original.
    const uploaded = Buffer.from(await client.file(objectKey).arrayBuffer());
    if (!uploaded.equals(bytes))
      throw new Error("Image upload verification failed.");
  };
  await upload(key, optimized);
  if (kind === "screenshots") {
    const thumbnail = await sharp(optimized)
      .resize({
        width: 800,
        height: 800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
    await upload(`thumbnails/${hash}.webp`, thumbnail);
  }
  return `${marker}${key}`;
}

export async function resolveImage(
  value: string | undefined,
  existing: string,
  kind: ImageKind,
  id: string,
) {
  if (
    value === undefined ||
    value === existing ||
    value === imageUrl(existing, kind, id)
  )
    return existing;
  if (!value) return "";
  return storeImage(value, kind);
}
