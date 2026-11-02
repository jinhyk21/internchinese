import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Practice from './pages/Practice.jsx'
import Vocabulary from './pages/Vocabulary.jsx'
import History from './pages/History.jsx'
import Profile from './pages/Profile.jsx'
import Result from './pages/Result.jsx'
import Saved from './pages/Saved.jsx'
import Reset from './pages/Reset.jsx'
import Translate from './pages/Translate.jsx'
import Admin from './pages/Admin.jsx'

function Private({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="center-screen"><span className="seal">学</span></div>
  return session ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/reset" element={<Reset />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Private><Home /></Private>} />
      <Route path="/practice/:scenarioId" element={<Private><Practice /></Private>} />
      <Route path="/translate" element={<Private><Translate /></Private>} />
      <Route path="/vocabulary" element={<Private><Vocabulary /></Private>} />
      <Route path="/history" element={<Private><History /></Private>} />
      <Route path="/history/:sessionId" element={<Private><Result /></Private>} />
      <Route path="/saved" element={<Private><Saved /></Private>} />
      <Route path="/admin" element={<Private><Admin /></Private>} />
      <Route path="/profile" element={<Private><Profile /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
