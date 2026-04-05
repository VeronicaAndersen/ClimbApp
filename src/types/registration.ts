export type RegisterToComp = {
  level: number;
};

export type RegisterToCompResponse = {
  comp_id: number;
  user_id: number;
  level: number;
  approved: boolean;
  created_at: string;
};

export type RegistrationWithClimber = {
  comp_id: number;
  user_id: number;
  level: number;
  approved: boolean;
  created_at: string;
  climber_name: string;
};

export type RegistrationApprovalUpdate = {
  approved: boolean;
};

export type RegistrationLevelUpdate = {
  level: number;
};
