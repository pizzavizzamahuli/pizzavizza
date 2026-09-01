import crypto from 'crypto';

export async function getCloudinaryConfig() {
  const { env } = await import('@/src/config/env');
  const cloudName = env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }
  return { cloudName, apiKey, apiSecret };
}

export async function createCloudinarySignature(params: Record<string, string>) {
  const { apiSecret } = await getCloudinaryConfig();
  const payload = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== '')
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto.createHash('sha1').update(`${payload}${apiSecret}`).digest('hex');
}

export function extractCloudinaryPublicId(url: string): string | null {
  if (!url) return null;
  const decoded = decodeURIComponent(url);
  const match = decoded.match(/\/image\/upload\/(?:[^/]+\/)*?(?:v\d+\/)?(.+?)(?:\.[^./?#]+)?(?:$|\?|#)/);
  return match?.[1] ?? null;
}

export async function deleteCloudinaryResource(publicId: string, resourceType = 'image') {
  const { cloudName, apiKey } = await getCloudinaryConfig();
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = await createCloudinarySignature({ public_id: publicId, resource_type: resourceType, timestamp });

  const formData = new FormData();
  formData.append('public_id', publicId);
  formData.append('timestamp', timestamp);
  formData.append('api_key', apiKey);
  formData.append('signature', signature);
  formData.append('resource_type', resourceType);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/destroy`, {
    method: 'POST',
    body: formData,
  });
  const json = await response.json();
  if (!response.ok || json.result !== 'ok') {
    throw new Error(json.error?.message || 'Failed to delete Cloudinary resource');
  }
}
