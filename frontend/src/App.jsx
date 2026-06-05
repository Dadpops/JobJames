import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import './App.css'

export default function App() {
  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">JobJames</span>
      </header>
      <main className="app-main">
        <Routes>
          <Route path="/" element={<HomePage />} />
        </Routes>
      </main>
    </div>
  )
}
