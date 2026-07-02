// Generates a 24-char hex ID with the same structure as a MongoDB ObjectId
// (8-char timestamp + 16-char random). These IDs are permanent on both client
// and server — the backend stores them directly as the MongoDB document _id.
export function generateLocalId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, '0');
  let random = '';
  for (let i = 0; i < 16; i++) {
    random += Math.floor(Math.random() * 16).toString(16);
  }
  return timestamp + random;
}
