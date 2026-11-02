import { supabase } from './supabase'

export const HSK_LEVELS = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'HSK 7-9']

const head = (q) => q.then(r => r.count || 0)

// Tổng số từ / số từ đã nhớ (remembered+mastered) / đã thuộc (mastered) của một cấp HSK — chỉ dùng count, không tải dữ liệu
export async function levelStats(userId, level) {
  const done = (statuses) => supabase.from('user_vocabulary')
    .select('id, vocabulary!inner(difficulty, category_id)', { count: 'exact', head: true })
    .eq('user_id', userId).eq('vocabulary.difficulty', level).is('vocabulary.category_id', null).in('status', statuses)
  const [total, learned, mastered] = await Promise.all([
    head(supabase.from('vocabulary').select('id', { count: 'exact', head: true }).eq('difficulty', level).is('category_id', null)),
    head(done(['remembered', 'mastered'])),
    head(done(['mastered'])),
  ])
  return { level, total, learned, mastered }
}

export const allLevelStats = (userId) => Promise.all(HSK_LEVELS.map(l => levelStats(userId, l)))
