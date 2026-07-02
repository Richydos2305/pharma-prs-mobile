const VIDEO_TO_AUDIO: Record<string, string> = {
  'video/mp4': 'audio/mp4',
  'video/webm': 'audio/webm',
  'video/ogg': 'audio/ogg'
};

export function normalizeUploadMimeType(mimeType: string): string {
  if (!mimeType.startsWith('video/')) return mimeType;
  return VIDEO_TO_AUDIO[mimeType] ?? 'audio/mp4';
}
