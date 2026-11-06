import { useState } from 'react'
import { PageHeader } from '../components/ui.jsx'
import WordPicker from '../components/WordPicker.jsx'
import StrokePractice from '../components/StrokePractice.jsx'
import VocabWriting from '../components/VocabWriting.jsx'
import FreeWriting from '../components/FreeWriting.jsx'
import XingshuWriting from '../components/XingshuWriting.jsx'

const TABS = [['strokes', '笔画', 'Nét cơ bản'], ['guided', '描红', 'Theo từ vựng · có hướng dẫn'], ['free', '默写', 'Tập viết · không hướng dẫn'], ['xing', '行书', 'Hành thư · viết liền nét, nhanh']]

export default function Writing() {
  const [tab, setTab] = useState(() => localStorage.getItem('ic_write_tab') || 'strokes')
  const [word, setWord] = useState(null)
  const pick = (t) => { setTab(t); try { localStorage.setItem('ic_write_tab', t) } catch { /* bỏ qua */ } }

  return (
    <>
      <PageHeader zh="写字" title="Luyện viết chữ Hán" crumbs={[[null, 'Luyện viết']]}
        sub="Ba bước: học 12 nét cơ bản → viết theo từ vựng có hướng dẫn thứ tự nét → tự viết không gợi ý, chỉ nhìn chữ mẫu.">
        <div className="seg2">
          {TABS.map(([k, zh]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => pick(k)}>{zh}</button>)}
        </div>
      </PageHeader>
      <h2 className="h2 sm"><span className="zh">{TABS.find(t => t[0] === tab)[1]}</span> {TABS.find(t => t[0] === tab)[2]}</h2>

      {tab === 'strokes' ? <StrokePractice /> : (
        <div className="wr-cols">
          <WordPicker word={word} onPick={setWord} />
          {word && (tab === 'guided' ? <VocabWriting key={word.id} word={word} /> : tab === 'xing' ? <XingshuWriting key={word.id} word={word} /> : <FreeWriting key={word.id} word={word} />)}
        </div>
      )}
    </>
  )
}
