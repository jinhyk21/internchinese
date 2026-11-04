import { Suspense, lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
const Home = lazy(() => import('./pages/Home.jsx'))
const Practice = lazy(() => import('./pages/Practice.jsx'))
const Vocabulary = lazy(() => import('./pages/Vocabulary.jsx'))
const History = lazy(() => import('./pages/History.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const Result = lazy(() => import('./pages/Result.jsx'))
const Saved = lazy(() => import('./pages/Saved.jsx'))
import Reset from './pages/Reset.jsx'
const Translate = lazy(() => import('./pages/Translate.jsx'))
const AdminLayout = lazy(() => import('./pages/admin/AdminLayout.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/Users.jsx'))
const AdminContent = lazy(() => import('./pages/admin/Content.jsx'))
const AdminUserDetail = lazy(() => import('./pages/admin/UserDetail.jsx'))
const AdminSessions = lazy(() => import('./pages/admin/Sessions.jsx'))
const AdminExams = lazy(() => import('./pages/admin/Exams.jsx'))
const AdminSaved = lazy(() => import('./pages/admin/Saved.jsx'))
const Writing = lazy(() => import('./pages/Writing.jsx'))
const Exams = lazy(() => import('./pages/Exams.jsx'))
const ExamTake = lazy(() => import('./pages/ExamTake.jsx'))

function Private({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <div className="center-screen"><span className="seal">学</span></div>
  return session ? <Layout><Suspense fallback={<div className="center-screen"><span className="seal">学</span></div>}>{children}</Suspense></Layout> : <Navigate to="/login" replace />
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
      <Route path="/writing" element={<Private><Writing /></Private>} />
      <Route path="/exams" element={<Private><Exams /></Private>} />
      <Route path="/exams/:track/:no" element={<Private><ExamTake /></Private>} />
      <Route path="/history" element={<Private><History /></Private>} />
      <Route path="/history/:sessionId" element={<Private><Result /></Private>} />
      <Route path="/saved" element={<Private><Saved /></Private>} />
      <Route path="/admin" element={<Suspense fallback={<div className="center-screen"><span className="seal">学</span></div>}><AdminLayout /></Suspense>}>
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="users/:id" element={<AdminUserDetail />} />
        <Route path="categories" element={<AdminContent table="categories" />} />
        <Route path="scenarios" element={<AdminContent table="scenarios" />} />
        <Route path="vocabulary" element={<AdminContent table="vocabulary" />} />
        <Route path="sessions" element={<AdminSessions />} />
        <Route path="exams" element={<AdminExams />} />
        <Route path="saved" element={<AdminSaved />} />
      </Route>
      <Route path="/profile" element={<Private><Profile /></Private>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
