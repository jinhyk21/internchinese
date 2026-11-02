import { Link } from 'react-router-dom'
import Bookmark from './Bookmark.jsx'
import { ICON, LEVEL } from './ui.jsx'

export default function ScenarioCard({ s, cat, marked, cta = '开始练习 · Bắt đầu', badge }) {
  return (
    <article className="card scroll">
      <span className="seal sm">{ICON[cat?.icon] || '学'}</span>
      <Bookmark kind="scenario" id={s.id} initial={marked} />
      {badge && <span className="ribbon">{badge}</span>}
      <h3 className="zh">{s.title_zh}</h3>
      <h4>{s.title}</h4>
      <p>{s.description}</p>
      <div className="meta">
        <span className={'tag ' + s.difficulty}>{LEVEL[s.difficulty]}</span>
        <span>⏱ {s.estimated_minutes}′</span>
        {cat && <span>{cat.name_zh}</span>}
        <span>{s.ai_role_zh} · {s.ai_role}</span>
      </div>
      <Link className="btn" to={`/practice/${s.id}`}>{cta}</Link>
    </article>
  )
}
