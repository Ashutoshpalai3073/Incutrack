import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL || 'https://kntoyozitskrblvxmbpp.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtudG95b3ppdHNrcmJsdnhtYnBwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4Njg1ODMsImV4cCI6MjA5NTQ0NDU4M30.o1nTOoJ4BPKrr95WAuqYa3FfDwIhjj10R5Ra7eBVGok';

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