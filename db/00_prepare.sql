-- Chuẩn bị: index + chuẩn hóa độ khó cũ sang cấp HSK
CREATE INDEX IF NOT EXISTS idx_vocab_chinese ON public.vocabulary(chinese);
CREATE INDEX IF NOT EXISTS idx_vocab_difficulty ON public.vocabulary(difficulty);
UPDATE public.vocabulary SET difficulty = CASE difficulty WHEN 'beginner' THEN 'HSK 2' WHEN 'intermediate' THEN 'HSK 4' WHEN 'advanced' THEN 'HSK 6' ELSE difficulty END
WHERE difficulty IN ('beginner','intermediate','advanced');
