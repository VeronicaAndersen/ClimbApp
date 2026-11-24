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
  /** The climber's username. */
  climber_name: string;
  firstname?: string | null;
  lastname?: string | null;
};

export type RegistrationWithCompetition = {
  comp_id: number;
  competition_name: string;
  comp_date: string;
  level: number;
  approved: boolean;
  created_at: string;
};

export type RegistrationApprovalUpdate = {
  approved: boolean;
};

export type RegistrationLevelUpdate = {
  level: number;
};
