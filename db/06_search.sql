-- Tìm kiếm KHÔNG DẤU cho tiếng Việt & pinyin ("xuat nhap khau", "ni hao", "khach hang")
-- Chạy trong Supabase SQL Editor. Chạy lại nhiều lần không sao.
CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm  WITH SCHEMA extensions;

-- hàm chuẩn hóa: bỏ dấu, hạ chữ thường, đ→d (IMMUTABLE để dùng trong trigger/index)
CREATE OR REPLACE FUNCTION public.norm_text(t text) RETURNS text
LANGUAGE sql IMMUTABLE PARALLEL SAFE SET search_path = public, extensions AS $$
  SELECT lower(replace(replace(unaccent('extensions.unaccent'::regdictionary, coalesce(t, '')), 'đ', 'd'), 'Đ', 'd'))
$$;

-- ===== TỪ VỰNG =====
ALTER TABLE public.vocabulary ADD COLUMN IF NOT EXISTS search_text text;

CREATE OR REPLACE FUNCTION public.vocabulary_search_text() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  NEW.search_text := NEW.chinese || ' ' || public.norm_text(NEW.pinyin) || ' ' || public.norm_text(NEW.vietnamese)
                     || ' ' || public.norm_text(NEW.example_vietnamese);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vocabulary_search_text ON public.vocabulary;
CREATE TRIGGER vocabulary_search_text BEFORE INSERT OR UPDATE OF chinese, pinyin, vietnamese, example_vietnamese
ON public.vocabulary FOR EACH ROW EXECUTE FUNCTION public.vocabulary_search_text();

UPDATE public.vocabulary SET search_text = chinese || ' ' || public.norm_text(pinyin) || ' ' || public.norm_text(vietnamese)
  || ' ' || public.norm_text(example_vietnamese) WHERE search_text IS NULL;
CREATE INDEX IF NOT EXISTS idx_vocab_search ON public.vocabulary USING gin (search_text extensions.gin_trgm_ops);

-- ===== TÌNH HUỐNG =====
ALTER TABLE public.scenarios ADD COLUMN IF NOT EXISTS search_text text;

CREATE OR REPLACE FUNCTION public.scenarios_search_text() RETURNS trigger
LANGUAGE plpgsql SET search_path = public, extensions AS $$
BEGIN
  NEW.search_text := coalesce(NEW.title_zh, '') || ' ' || public.norm_text(NEW.title) || ' ' || public.norm_text(NEW.description)
                     || ' ' || public.norm_text(NEW.ai_role) || ' ' || public.norm_text(NEW.situation);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS scenarios_search_text ON public.scenarios;
CREATE TRIGGER scenarios_search_text BEFORE INSERT OR UPDATE OF title, title_zh, description, ai_role, situation
ON public.scenarios FOR EACH ROW EXECUTE FUNCTION public.scenarios_search_text();

UPDATE public.scenarios SET search_text = coalesce(title_zh, '') || ' ' || public.norm_text(title) || ' ' || public.norm_text(description)
  || ' ' || public.norm_text(ai_role) || ' ' || public.norm_text(situation) WHERE search_text IS NULL;
CREATE INDEX IF NOT EXISTS idx_scen_search ON public.scenarios USING gin (search_text extensions.gin_trgm_ops);

-- kiểm tra: phải trả về các từ "khách hàng"
SELECT chinese, vietnamese FROM public.vocabulary WHERE search_text ILIKE '%khach hang%' LIMIT 5;
