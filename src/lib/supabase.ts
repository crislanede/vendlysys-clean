import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://uurezyecsaxchobklixb.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1cmV6eWVjc2F4Y2hvYmtsaXhiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU2OTk2MTAsImV4cCI6MjA5MTI3NTYxMH0.IXJdLprXw0sBfp_W0YgjB5FFeoi_svMCT7gmlLi7IAg";

export const supabase = createClient(supabaseUrl, supabaseKey);