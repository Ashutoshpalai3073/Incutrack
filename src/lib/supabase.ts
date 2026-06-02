import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL  as string;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(url, key);

export type VaultDoc = {
  id?:             string;
  name:            string;
  type:            string;
  date:            string;
  views:           number;
  status:          string;
  score:           number;
  file_url?:       string;
  file_path?:      string;
  startup_id?:     string;
  startup_name?:   string;
  remark?:         string;
  investmentMessage?: string;
  read_access?:    boolean;
};