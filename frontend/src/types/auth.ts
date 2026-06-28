export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string | null;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload extends LoginPayload {
  full_name: string;
}

export interface AuthSession {
  access_token: string;
  token_type: 'bearer';
  user: AuthUser;
}
