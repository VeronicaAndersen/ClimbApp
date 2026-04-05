export type LoginRequest = {
  username: string;
  password: string;
};

export type LoginResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
};

/** Same shape as LoginRequest — kept as alias for clarity at call sites */
export type SignupRequest = LoginRequest;

export type SignupResponse = LoginResponse & {
  climber: {
    id: number;
    name: string;
    user_scope: string;
    created_at: string;
  };
};

export type PasswordResetRequest = {
  username: string;
};

export type PasswordResetConfirm = {
  token: string;
  new_password: string;
};
