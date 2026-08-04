import { confirmUpload, createUploadUrl, MediaOut } from "./authApi";

// A picked file, ready to send to storage.
export interface UploadableImage {
  uri: string;
  name: string;
  type: string;
  size?: number | null;
}

/**
 * Uploads an image in three steps:
 *   1. ask the API where to put it
 *   2. send the file straight to storage
 *   3. tell the API the file arrived
 *
 * Step 2 uses plain fetch, not our axios client, because axios would attach
 * the login token and a JSON content type to a request that goes to storage.
 */
export const uploadImage = async (
  image: UploadableImage
): Promise<MediaOut> => {
  const slot = await createUploadUrl({ content_type: image.type });

  if (image.size && image.size > slot.max_bytes) {
    const limit = (slot.max_bytes / (1024 * 1024)).toFixed(1);
    throw new Error(`That image is too large. The limit is ${limit} MB.`);
  }

  const form = new FormData();

  // The storage service needs its own fields first and the file last.
  Object.keys(slot.fields || {}).forEach((key) => {
    form.append(key, String(slot.fields[key]));
  });

  form.append("file", {
    uri: image.uri,
    name: image.name,
    type: image.type,
  } as any);

  const response = await fetch(slot.upload_url, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    throw new Error(`Upload failed (${response.status})`);
  }

  return confirmUpload(slot.asset_id);
};
