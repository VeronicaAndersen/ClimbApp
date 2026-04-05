export type RegistrationRequest = {
  username: string;
  password: string;
  email: string;
  firstname: string;
  lastname: string;
  club?: string;
};

export type ClimberResponse = {
  id: number;
  username: string;
  user_scope: string;
  created_at: string;
  email: string;
  firstname: string;
  lastname: string;
  club: string;
};

/** Alias — /climber/me returns the same shape as ClimberResponse */
export type MyInfoResponse = ClimberResponse;

export type ClimberUpdateRequest = {
  username?: string;
  password?: string;
  user_scope?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  club?: string;
};
