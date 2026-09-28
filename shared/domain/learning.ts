export type ExamStatus = 'draft' | 'published' | 'cancelled';

export interface Exam {
  id: string;
  class_id: string;
  assignment_id: string | null;
  title: string;
  description: string | null;
  instructions: string | null;
  starts_at: string;
  duration_minutes: number;
  room: string | null;
  status: ExamStatus;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface LearningVideo {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  video_url: string;
  duration_minutes: number | null;
  published: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export function isSafeVideoUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'youtu.be', 'vimeo.com', 'www.vimeo.com'].includes(url.hostname);
  } catch {
    return false;
  }
}

export function getVideoEmbedUrl(value: string): string | null {
  if (!isSafeVideoUrl(value)) return null;
  const url = new URL(value);
  if (url.hostname === 'youtu.be') return `https://www.youtube.com/embed/${url.pathname.slice(1)}`;
  if (url.hostname.endsWith('youtube.com')) {
    const id = url.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : null;
  }
  const id = url.pathname.split('/').filter(Boolean)[0];
  return id ? `https://player.vimeo.com/video/${id}` : null;
}
