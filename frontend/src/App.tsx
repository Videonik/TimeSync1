import React from 'react'
import { BrowserRouter, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom'
import { CreateEventForm } from './components/CreateEventForm'
import { VotingGrid } from './components/VotingGrid'
import { AuthCallback } from './components/AuthCallback'
import { LoginButton } from './components/LoginButton'
import { MyCalendar } from './components/MyCalendar'
import { Dashboard } from './components/Dashboard'
import { Profile } from './components/Profile'

function Navigation() {
  const location = useLocation();
  const isLoggedIn = !!localStorage.getItem('jwt_token');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navLinkClass = (path: string) => 
    `text-sm font-bold transition-all px-4 py-2 rounded-xl ${
      location.pathname === path 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
    }`;

  const mobileNavLinkClass = (path: string) => 
    `block text-base font-bold transition-all px-4 py-3 rounded-xl ${
      location.pathname === path 
        ? 'bg-blue-50 text-blue-600' 
        : 'text-gray-600 hover:bg-gray-50'
    }`;

  // Close mobile menu on route change
  React.useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 md:gap-3 group">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-xl md:rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 md:w-6 md:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </div>
          <h1 className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-600 tracking-tight">
            TimeSync
          </h1>
        </Link>
        
        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {isLoggedIn && <Link to="/dashboard" className={navLinkClass('/dashboard')}>Дашборд</Link>}
          <Link to="/create" className={navLinkClass('/create')}>Новая встреча</Link>
          <Link to="/my-calendar" className={navLinkClass('/my-calendar')}>Мой календарь</Link>
          {isLoggedIn && <Link to="/profile" className={navLinkClass('/profile')}>Профиль</Link>}
          <div className="w-px h-6 bg-gray-200 mx-2"></div>
          <LoginButton />
        </nav>

        {/* Mobile Nav Toggle */}
        <div className="flex md:hidden items-center gap-2">
           <LoginButton />
           <button 
             onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
             className="p-2 -mr-2 text-gray-500 hover:text-gray-900 focus:outline-none"
             aria-label="Toggle menu"
           >
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               {isMobileMenuOpen ? (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
               ) : (
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
               )}
             </svg>
           </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full bg-white border-b border-gray-100 shadow-xl shadow-gray-200/20 py-4 px-4 flex flex-col gap-2">
          {isLoggedIn && <Link to="/dashboard" className={mobileNavLinkClass('/dashboard')}>Дашборд</Link>}
          <Link to="/create" className={mobileNavLinkClass('/create')}>Новая встреча</Link>
          <Link to="/my-calendar" className={mobileNavLinkClass('/my-calendar')}>Мой календарь</Link>
          {isLoggedIn && <Link to="/profile" className={mobileNavLinkClass('/profile')}>Профиль</Link>}
        </div>
      )}
    </header>
  );
}

function App() {
  const isLoggedIn = !!localStorage.getItem('jwt_token');

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#FDFDFF] font-sans text-gray-900 selection:bg-blue-100 selection:text-blue-900 flex flex-col">
        <Navigation />

        <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-10 flex justify-center">
          <Routes>
            <Route path="/" element={isLoggedIn ? <Navigate to="/dashboard" /> : <Navigate to="/create" />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create" element={<CreateEventForm />} />
            <Route path="/event/:id" element={<VotingGrid />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/my-calendar" element={<MyCalendar />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-gray-100 py-10 mt-auto">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
               <div className="w-6 h-6 bg-gray-200 rounded-lg"></div>
               <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">TimeSync Pro</span>
            </div>
            <div className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} Все права защищены. Сделано для эффективных команд.
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  )
}

export default App
