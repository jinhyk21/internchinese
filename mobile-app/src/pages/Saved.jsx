import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth.jsx'
import Bookmark from '../components/Bookmark.jsx'
import ScenarioCard from '../components/ScenarioCard.jsx'
import { Empty, PageHeader, Skeleton } from '../components/ui.jsx'

const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }

export default function Saved() {
  const { user } = useAuth()
  const [rows, setRows] = useState(null)
  const [cats, setCats] = useState([])
  const [tab, setTab] = useState('scenario')
  useEffect(() => {
    (async () => {
      const [b, c] = await Promise.all([
        supabase.from('bookmarks')
          .select('id,item_type,scenario_id,vocabulary_id,scenarios(*),vocabulary(*)')
          .eq('user_id', user.id).order('created_at', { ascending: false }).limit(500),
        supabase.from('categories').select('id,name_zh,icon'),
      ])
      setRows(b.data || []); setCats(c.data || [])
    })()
  }, [user.id])

  const sc = (rows || []).filter(r => r.item_type === 'scenario' && r.scenarios)
  const vo = (rows || []).filter(r => r.item_type === 'vocabulary' && r.vocabulary)

  return (
    <>
      <PageHeader zh="收藏" title="Đã lưu" crumbs={[[null, 'Đã lưu']]} sub="Những tình huống và từ vựng bạn đánh dấu sao để quay lại luyện tập sau.">
        <div className="seg2">
          <button className={tab === 'scenario' ? 'on' : ''} onClick={() => setTab('scenario')}>情景 · {sc.length}</button>
          <button className={tab === 'vocabulary' ? 'on' : ''} onClick={() => setTab('vocabulary')}>词汇 · {vo.length}</button>
        </div>
      </PageHeader>
      {!rows ? <Skeleton /> : tab === 'scenario' ? (
        sc.length ? <div className="grid">{sc.map(r => <ScenarioCard key={r.id} s={r.scenarios} cat={cats.find(c => c.id === r.scenarios.category_id)} marked />)}</div>
          : <Empty zh="空" title="Chưa lưu tình huống nào" text="Bấm ngôi sao ★ ở góc thẻ tình huống để lưu lại." to="/" cta="Khám phá tình huống" />
      ) : (
        vo.length ? (
          <div className="grid vgrid">{vo.map(r => (
            <article className="card flash" key={r.id}>
              <Bookmark kind="vocabulary" id={r.vocabulary_id} initial />
              <span className="lvl">{r.vocabulary.difficulty}</span>
              <div className="face"><div className="hanzi">{r.vocabulary.chinese}</div>
                <div className="pinyin">{r.vocabulary.pinyin}</div><div className="vi">{r.vocabulary.vietnamese}</div></div>
              <div className="row"><button className="btn ghost sm" onClick={() => speak(r.vocabulary.chinese)}>🔊</button></div>
            </article>))}</div>
        ) : <Empty zh="词" title="Chưa lưu từ vựng nào" text="Bấm ★ trên thẻ từ vựng để lưu." to="/vocabulary" cta="Mở từ vựng" />
      )}
    </>
  )
}
