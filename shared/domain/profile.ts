export type Role = 'admin' | 'vice_principal' | 'teacher' | 'student';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: Role;
  restricted: boolean;
  school_id: string;
}
