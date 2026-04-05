export type SeasonRequest = {
  name?: string;
  year?: number;
};

export type SeasonResponse = {
  id: number;
  name: string;
  year: number;
  created_at: string;
};
