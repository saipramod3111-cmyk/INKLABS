import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive ? 'bg-zinc-100 text-zinc-900' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="text-2xl font-black tracking-tight" aria-label="InkLabs home">
          Ink<span className="text-indigo-600">Labs</span>
        </Link>
        <nav className="flex items-center gap-1 sm:gap-2">
          <NavLink to="/customize" className={linkClass}>Design</NavLink>
          <NavLink to="/cart" className={linkClass}>
            Cart
            {count > 0 && (
              <span className="ml-1.5 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[11px] font-semibold text-white">{count}</span>
            )}
          </NavLink>
          {user ? (
            <>
              <NavLink to="/dashboard" className={linkClass}>My Inventory</NavLink>
              <button onClick={handleLogout} className="btn-secondary ml-1 hidden sm:inline-flex">Log out</button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkClass}>Log in</NavLink>
              <Link to="/signup" className="btn-primary ml-1">Sign up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
