import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useInfinite } from '../paged.js'
import { useAuth } from '../auth.jsx'
import Bookmark from '../components/Bookmark.jsx'
import ScenarioCard from '../components/ScenarioCard.jsx'
import { Empty, MoreSentinel, PageHeader, Skeleton } from '../components/ui.jsx'

const speak = (t) => { const u = new SpeechSynthesisUtterance(t); u.lang = 'zh-CN'; speechSynthesis.cancel(); speechSynthesis.speak(u) }

export default function Saved() {
  const { user } = useAuth()
  const [cats, setCats] = useState([])
  const [tab, setTab] = useState('scenario')
  const [n, setN] = useState({ scenario: 0, vocabulary: 0 })
  useEffect(() => {
    (async () => {
      const cnt = (t) => supabase.from('bookmarks').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('item_type', t).then(r => r.count || 0)
      const [c, a, b] = await Promise.all([supabase.from('categories').select('id,name_zh,icon'), cnt('scenario'), cnt('vocabulary')])
      setCats(c.data || []); setN({ scenario: a, vocabulary: b })
    })()
  }, [user.id])

  // cuộn vô hạn theo từng tab, 12 mục/lần
  const list = useInfinite((from, to) => supabase.from('bookmarks')
    .select(tab === 'scenario' ? 'id,scenario_id,scenarios(*)' : 'id,vocabulary_id,vocabulary(id,chinese,pinyin,vietnamese,difficulty)', { count: 'exact' })
    .eq('user_id', user.id).eq('item_type', tab).order('created_at', { ascending: false }).range(from, to), [tab, user.id], 12)
  const rows = list.items && list.items.filter(r => (tab === 'scenario' ? r.scenarios : r.vocabulary))
  const sc = tab === 'scenario' ? rows : [], vo = tab === 'vocabulary' ? rows : []

  return (
    <>
      <PageHeader zh="收藏" title="Đã lưu" crumbs={[[null, 'Đã lưu']]} sub="Những tình huống và từ vựng bạn đánh dấu sao để quay lại luyện tập sau.">
        <div className="seg2">
          <button className={tab === 'scenario' ? 'on' : ''} onClick={() => setTab('scenario')}>情景 · {n.scenario}</button>
          <button className={tab === 'vocabulary' ? 'on' : ''} onClick={() => setTab('vocabulary')}>词汇 · {n.vocabulary}</button>
        </div>
      </PageHeader>
      {!rows ? <Skeleton /> : tab === 'scenario' ? (
        sc.length ? <><div className="grid">{sc.map(r => <ScenarioCard key={r.id} s={r.scenarios} cat={cats.find(c => c.id === r.scenarios.category_id)} marked />)}</div><MoreSentinel sentinel={list.sentinel} done={list.done} shown={sc.length} count={list.count} /></>
          : <Empty zh="空" title="Chưa lưu tình huống nào" text="Bấm ngôi sao ★ ở góc thẻ tình huống để lưu lại." to="/" cta="Khám phá tình huống" />
      ) : (
        vo.length ? (
          <><div className="grid vgrid">{vo.map(r => (
            <article className="card flash" key={r.id}>
              <Bookmark kind="vocabulary" id={r.vocabulary_id} initial />
              <span className="lvl">{r.vocabulary.difficulty}</span>
              <div className="face"><div className="hanzi">{r.vocabulary.chinese}</div>
                <div className="pinyin">{r.vocabulary.pinyin}</div><div className="vi">{r.vocabulary.vietnamese}</div></div>
              <div className="row"><button className="btn ghost sm" onClick={() => speak(r.vocabulary.chinese)}>🔊</button></div>
            </article>))}</div><MoreSentinel sentinel={list.sentinel} done={list.done} shown={vo.length} count={list.count} /></>
        ) : <Empty zh="词" title="Chưa lưu từ vựng nào" text="Bấm ★ trên thẻ từ vựng để lưu." to="/vocabulary" cta="Mở từ vựng" />
      )}
    </>
  )
}
