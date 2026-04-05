export type Grade = {
  level: number;
};

export type UrlParams = {
  id?: number;
  comp_id?: number;
  level?: number;
  problem_no?: number;
};

export type MessageProps = {
  message: string;
  color:
    | "ruby"
    | "gray"
    | "gold"
    | "bronze"
    | "brown"
    | "yellow"
    | "amber"
    | "orange"
    | "tomato"
    | "red"
    | "crimson"
    | "pink"
    | "plum"
    | "purple"
    | "violet"
    | "iris"
    | "indigo"
    | "blue"
    | "sky"
    | "green";
};
