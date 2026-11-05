import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { Seg, Donut, Empty, Head, HBars, Loading, Modal, Pager, Panel, Tag, useToast } from './ui.jsx'
import { clearCache, nameOf, pageAll, profilesById } from './lib.js'
import Picker from './Picker.jsx'

const SIZE = 25
const STAT = { learning: 'Đang học', remembered: 'Đã nhớ', mastered: 'Thuộc' }

export default function Saved() {
  const toast = useToast()
  const [d, setD] = useState(null)
  const [tab, setTab] = useState('bm')
  const [page, setPage] = useState(1)
  const [type, setType] = useState('')
  const [edit, setEdit] = useState(null)

  const [vocab, setVocab] = useState({})
  const [pm, setPm] = useState({})

  const load = async () => {
    clearCache()
    const [bm, uv, sc] = await Promise.all([
      pageAll('bookmarks', 'id,user_id,item_type,scenario_id,vocabulary_id,created_at'),
      pageAll('user_vocabulary', 'id,user_id,vocabulary_id,status,review_count,last_reviewed_at'),
      supabase.from('scenarios').select('id,title').order('title'),
    ])
    setD({
      bms: bm.data.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || '')),
      uv: uv.data.sort((a, b) => (b.last_reviewed_at || '').localeCompare(a.last_reviewed_at || '')),
      scList: sc.data || [], sc: Object.fromEntries((sc.data || []).map(s => [s.id, s.title])),
    })
  }
  useEffect(() => { load() }, [])
  useEffect(() => setPage(1), [tab, type])

  const s = useMemo(() => {
    if (!d) return null
    const cnt = (l, f) => l.reduce((m, x) => { const k = f(x); if (k) m[k] = (m[k] || 0) + 1; return m }, {})
    const top = (m, n = 6) => Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, n)
    return {
      types: Object.entries(cnt(d.bms, b => b.item_type)).map(([k, v]) => ({ label: k === 'scenario' ? 'Tình huống' : 'Từ vựng', value: v })),
      status: Object.entries(cnt(d.uv, u => u.status)).map(([k, v]) => ({ label: STAT[k] || k, value: v })),
      topUserIds: top(cnt(d.uv, u => u.user_id)),
    }
  }, [d])

  const list = d ? (tab === 'bm' ? d.bms.filter(b => !type || b.item_type === type) : d.uv) : []
  const view = list.slice((page - 1) * SIZE, page * SIZE)
  // Chỉ tải tên cho dòng đang hiển thị (trang hiện tại + bảng top) thay vì cả bảng
  const need = useMemo(() => !s ? { v: [], u: [] } : {
    v: [...new Set(view.map(r => r.vocabulary_id).filter(Boolean))],
    u: [...new Set(view.map(r => r.user_id).concat(s.topUserIds.map(x => x[0])).filter(Boolean))],
  }, [s, tab, type, page, d])
  useEffect(() => {
    const miss = need.v.filter(id => !vocab[id])
    if (miss.length) supabase.from('vocabulary').select('id,chinese,vietnamese').in('id', miss).then(r => setVocab(v => ({ ...v, ...Object.fromEntries((r.data || []).map(x => [x.id, x])) })))
    profilesById(need.u).then(m => setPm(p => ({ ...p, ...m })))
  }, [need])

  const save = async (e) => {
    e.preventDefault()
    const f = edit.form
    let op
    if (tab === 'bm') {
      const row = { user_id: f.user_id, item_type: f.item_type, scenario_id: f.item_type === 'scenario' ? f.scenario_id || null : null, vocabulary_id: f.item_type === 'vocabulary' ? f.vocabulary_id || null : null }
      if (!row.scenario_id && !row.vocabulary_id) return toast('Hãy chọn mục cần lưu', 'err')
      op = edit.id ? supabase.from('bookmarks').update(row).eq('id', edit.id) : supabase.from('bookmarks').insert(row)
    } else {
      const row = { user_id: f.user_id, vocabulary_id: f.vocabulary_id, status: f.status, review_count: Number(f.review_count) || 0 }
      op = edit.id ? supabase.from('user_vocabulary').update(row).eq('id', edit.id) : supabase.from('user_vocabulary').upsert(row, { onConflict: 'user_id,vocabulary_id' })
    }
    const { error } = await op
    if (error) return toast(error.message, 'err')
    toast('Đã lưu'); setEdit(null); load()
  }
  const remove = async (table, id) => {
    if (!window.confirm('Xóa mục này?')) return
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) return toast(error.message, 'err'); toast('Đã xóa'); load()
  }
  if (!d) return <Loading />
  const F = edit?.form
  const setF = (k, v) => setEdit(e => ({ ...e, form: { ...e.form, [k]: v } }))
  const newForm = () => tab === 'bm' ? { user_id: '', item_type: 'vocabulary', scenario_id: '', vocabulary_id: '' } : { user_id: '', vocabulary_id: '', status: 'learning', review_count: 0 }

  return (
    <>
      <Head title="Đã lưu & tiến độ từ vựng" sub={`${d.bms.length} mục đã lưu · ${d.uv.length} từ đang theo dõi`}>
        <button className="a-btn" onClick={() => setEdit({ form: newForm() })}>＋ Thêm</button>
      </Head>
      <div className="a-grid g3">
        <Panel title="Loại mục đã lưu"><Donut items={s.types} /></Panel>
        <Panel title="Trạng thái từ vựng"><Donut items={s.status} /></Panel>
        <Panel title="Học viên học nhiều từ nhất"><HBars items={s.topUserIds.map(([id, v]) => ({ label: nameOf(pm[id]), value: v }))} unit=" từ" /></Panel>
      </div>
      <Panel>
        <div className="a-bar">
          <div className="a-seg"><button className={tab === 'bm' ? 'on' : ''} onClick={() => setTab('bm')}>★ Mục đã lưu</button><button className={tab === 'uv' ? 'on' : ''} onClick={() => setTab('uv')}>文 Từ đang học</button></div>
          {tab === 'bm' && <Seg value={type} onChange={setType} options={[['', 'Tất cả'], ['scenario', 'Tình huống'], ['vocabulary', 'Từ vựng']]} />}
        </div>
        {!view.length ? <Empty /> : (
          <div className="a-table"><table>
            <thead><tr><th>Học viên</th>{tab === 'bm' ? <><th>Loại</th><th>Mục</th></> : <><th>Từ</th><th>Trạng thái</th><th className="r">Ôn</th></>}<th className="r">Thao tác</th></tr></thead>
            <tbody>{view.map(r => (
              <tr key={r.id}><td>{nameOf(pm[r.user_id])}</td>
                {tab === 'bm' ? <>
                  <td><Tag kind={r.item_type === 'scenario' ? 'violet' : 'cyan'}>{r.item_type}</Tag></td>
                  <td>{r.item_type === 'scenario' ? d.sc[r.scenario_id] : vocab[r.vocabulary_id] ? `${vocab[r.vocabulary_id].chinese} — ${vocab[r.vocabulary_id].vietnamese}` : '—'}</td>
                </> : <>
                  <td>{vocab[r.vocabulary_id] ? `${vocab[r.vocabulary_id].chinese} — ${vocab[r.vocabulary_id].vietnamese}` : '—'}</td>
                  <td><Tag kind={{ learning: 'amber', remembered: 'cyan', mastered: 'green' }[r.status]}>{STAT[r.status] || r.status}</Tag></td><td className="r">{r.review_count || 0}</td>
                </>}
                <td className="r"><button className="a-btn ghost sm" onClick={() => setEdit({ id: r.id, form: { ...newForm(), ...r } })}>Sửa</button>{' '}
                  <button className="a-btn danger sm" onClick={() => remove(tab === 'bm' ? 'bookmarks' : 'user_vocabulary', r.id)}>Xóa</button></td></tr>))}</tbody></table></div>
        )}
        <Pager page={page} size={SIZE} count={list.length} onChange={setPage} />
      </Panel>

      {edit && (
        <Modal title={`${edit.id ? 'Sửa' : 'Thêm'} ${tab === 'bm' ? 'mục đã lưu' : 'từ đang học'}`} onClose={() => setEdit(null)}>
          <form className="a-form" onSubmit={save}>
            <label className="full">Học viên<Picker table="profiles" value={F.user_id} onChange={v => setF('user_id', v)} /></label>
            {tab === 'bm' && <label className="full">Loại<select className="a-sel" value={F.item_type} onChange={e => setF('item_type', e.target.value)}><option value="vocabulary">Từ vựng</option><option value="scenario">Tình huống</option></select></label>}
            {(tab === 'uv' || F.item_type === 'vocabulary') && <label className="full">Từ vựng<Picker table="vocabulary" value={F.vocabulary_id} onChange={v => setF('vocabulary_id', v)} placeholder="Gõ chữ Hán hoặc nghĩa…" /></label>}
            {tab === 'bm' && F.item_type === 'scenario' && <label className="full">Tình huống<select className="a-sel" value={F.scenario_id || ''} onChange={e => setF('scenario_id', e.target.value)}><option value="">— Chọn —</option>{d.scList.map(x => <option key={x.id} value={x.id}>{x.title}</option>)}</select></label>}
            {tab === 'uv' && <>
              <label>Trạng thái<select className="a-sel" value={F.status} onChange={e => setF('status', e.target.value)}>{Object.entries(STAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
              <label>Số lần ôn<input className="a-in" type="number" min="0" value={F.review_count} onChange={e => setF('review_count', e.target.value)} /></label>
            </>}
            <div className="full a-actions"><button className="a-btn">Lưu</button><button type="button" className="a-btn ghost" onClick={() => setEdit(null)}>Hủy</button></div>
          </form>
        </Modal>
      )}
    </>
  )
}
