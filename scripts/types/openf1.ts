export interface OpenF1Session {
  session_key: number;
  meeting_key: number;
  year: number;
  session_name: string;
  session_type: string;
  circuit_short_name: string;
  country_name: string;
  location: string;
  date_start: string;
  date_end: string;
  is_cancelled?: boolean;
}

export interface OpenF1Meeting {
  meeting_key: number;
  meeting_name?: string;
  meeting_official_name?: string;
  location?: string;
  country_name?: string;
  date_start?: string;
  year?: number;
}

export interface OpenF1Driver {
  session_key: number;
  meeting_key: number;
  driver_number: number;
  full_name: string;
  name_acronym: string;
  team_name: string | null;
  team_colour: string | null;
}

export interface OpenF1GridEntry {
  session_key: number;
  driver_number: number;
  position: number | null;
}

export interface OpenF1RaceResult {
  session_key: number;
  driver_number: number;
  position: number | null;
  number_of_laps: number | null;
  duration: number | null;
  gap_to_leader: number | string | null;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
}

export interface OpenF1Lap {
  session_key: number;
  driver_number: number;
  lap_number: number;
  date_start: string | null;
  lap_duration: number | null;
  duration_sector_1: number | null;
  duration_sector_2: number | null;
  duration_sector_3: number | null;
  is_pit_out_lap: boolean | null;
}

export interface OpenF1Stint {
  session_key: number;
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number | null;
  compound: string | null;
  tyre_age_at_start: number | null;
}

export interface OpenF1Pit {
  session_key: number;
  driver_number: number;
  lap_number: number;
  date: string;
  lane_duration?: number | null;
  pit_duration?: number | null;
  stop_duration?: number | null;
}

export interface OpenF1Position {
  session_key: number;
  driver_number: number;
  date: string;
  position: number | null;
}

export interface OpenF1RaceControl {
  session_key: number;
  date: string;
  category: string;
  message: string;
  flag?: string | null;
  scope?: string | null;
  driver_number?: number | null;
  lap_number?: number | null;
  sector?: number | null;
}

export interface OpenF1Weather {
  session_key: number;
  date: string;
  air_temperature?: number | null;
  track_temperature?: number | null;
  humidity?: number | null;
  rainfall?: number | null;
  wind_speed?: number | null;
  wind_direction?: number | null;
}

export interface OpenF1Responses {
  sessions: OpenF1Session[];
  meetings: OpenF1Meeting[];
  drivers: OpenF1Driver[];
  starting_grid: OpenF1GridEntry[];
  session_result: OpenF1RaceResult[];
  laps: OpenF1Lap[];
  stints: OpenF1Stint[];
  pit: OpenF1Pit[];
  position: OpenF1Position[];
  race_control: OpenF1RaceControl[];
  weather: OpenF1Weather[];
}
