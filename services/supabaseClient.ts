import { createClient } from '@supabase/supabase-js';

// TODO: 替换为您从 Supabase 控制台获取的实际值
const supabaseUrl = 'https://bwefocmdijmhuhiajrhs.supabase.co';
// 注意：这里的 Key 看起来像 Stripe 的 Key，请确保它是 Supabase 的 Anon Key (通常以 eyJ... 开头)
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ3ZWZvY21kaWptaHVoaWFqcmhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyMzA4MTgsImV4cCI6MjA5MjgwNjgxOH0.9rno3z0Gy_me1PXJBI91t8MnHgoc4KSZguPO63CDUm0';

if (supabaseAnonKey.startsWith('sb_')) {
  console.warn('检测到可能的配置错误：supabaseAnonKey 看起来像是 Stripe 的 Key，而不是 Supabase 的 Anon Key。请从 Supabase 控制台 -> Settings -> API 获取正确的 Anon Key。');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
