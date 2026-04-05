export type CompetitionRequest = {
  name: string;
  description: string;
  comp_type: string;
  comp_date: string;
  season_id: number;
  round_no: number | null;
};

export type CompetitionResponse = {
  id: number;
  name: string;
  description: string;
  comp_type: string;
  comp_date: string;
  season_id: number;
  round_no: number | null;
};

export type CompetitionProps = {
  competition_id: number;
};
