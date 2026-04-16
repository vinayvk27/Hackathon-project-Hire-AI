import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login            from './pages/Login'
import JDGenerator      from './pages/JDGenerator'
import ResumeMatcher    from './pages/ResumeMatcher'
import Candidates       from './pages/Candidates'
import CandidateLogin   from './pages/CandidateLogin'
import Assessment       from './pages/Assessment'
import AssessmentResult from './pages/AssessmentResult'
import VideoInterview   from './pages/VideoInterview'
import Layout           from './components/Layout'

const PrivateRoute = ({ children }) => {
  const auth = localStorage.getItem('hire_ai_auth')
  return auth ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* HR Portal */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/jd" replace />} />
          <Route path="jd"         element={<JDGenerator />} />
          <Route path="match"      element={<ResumeMatcher />} />
          <Route path="candidates" element={<Candidates />} />
        </Route>

        {/* Candidate Portal */}
        <Route path="/candidate-login"  element={<CandidateLogin />} />
        <Route path="/assessment"       element={<Assessment />} />
        <Route path="/assessment/result" element={<AssessmentResult />} />
        <Route path="/interview"         element={<VideoInterview />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
