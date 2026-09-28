import type { SubmitAssignmentRequest } from '../domain/requests';
import type { SubmissionRow } from '../domain/assignments';

// Web uses same-origin cookies. Native supplies its server URL and session token.
export async function submitAssignment(
  payload: SubmitAssignmentRequest,
  options: { baseUrl?: string; accessToken?: string; fetcher?: typeof fetch } = {},
): Promise<SubmissionRow> {
  const response = await (options.fetcher ?? fetch)(`${(options.baseUrl ?? '').replace(/\/$/, '')}/api/submissions/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(options.accessToken ? { Authorization: `Bearer ${options.accessToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(typeof data?.error === 'string' ? data.error : 'Could not submit.');
  return data as SubmissionRow;
}
