export type RoomStatus =
  | "lobby"
  | "question_entry"
  | "voting"
  | "results"
  | "game_over";

export interface Room {
  id: string;
  code: string;
  status: RoomStatus;
  current_question_index: number;
  question_order: string[] | null;
  question_deadline: string | null;
  created_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  name: string;
  score: number;
  created_at: string;
}

export interface Question {
  id: string;
  room_id: string;
  player_id: string;
  text: string;
  number: number;
  created_at: string;
}

export interface Vote {
  id: string;
  question_id: string;
  player_id: string;
  vote: "red" | "black";
  created_at: string;
}
