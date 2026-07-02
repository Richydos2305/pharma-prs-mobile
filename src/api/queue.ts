import { apiClient } from './client';

export async function apiEnqueueJob(operation: string, localId: string, data: object): Promise<{ jobId: string }> {
  const { data: body } = await apiClient.post<{ data: { jobId: string } }>('/api/queue/jobs', { operation, localId, data });
  return body.data;
}

export async function apiGetJobStatus(jobId: string): Promise<{ status: string; error?: string }> {
  const { data: body } = await apiClient.get<{ data: { status: string; error?: string } }>(`/api/queue/jobs/${jobId}`);
  return body.data;
}
