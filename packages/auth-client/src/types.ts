export interface AuthResult {
  success: boolean;
  error?: string;
  token?: string;
}

export interface LoginParams {
  email: string;
  password: string;
}

export interface RegisterParams {
  name: string;
  email: string;
  password: string;
}

export interface UpdateProfileParams {
  name?: string;
  image?: string;
}

export interface RequestPasswordResetParams {
  email: string;
}

export interface ResetPasswordParams {
  newPassword: string;
  token: string;
}
