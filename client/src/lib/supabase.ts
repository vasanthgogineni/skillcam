import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://yrdmimdkhsdzqjjdajvv.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZG1pbWRraHNkenFqamRhanZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzgxMjksImV4cCI6MjA3OTUxNDEyOX0.gKCFOG9qMkBKal0RwUZohP8jsdSqWioDU2zx8Jw_JC4";

export const supabase = createClient(supabaseUrl, supabaseKey);

