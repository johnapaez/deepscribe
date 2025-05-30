import { Link, useLocation } from 'react-router-dom';
import { BookOpen, PenTool, Home } from 'lucide-react';

function Header() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <nav className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center space-x-2 text-xl font-bold text-gradient"
          >
            <BookOpen className="h-8 w-8 text-primary-600" />
            <span>DeepScribe</span>
          </Link>

          <div className="flex items-center space-x-6">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive('/') 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>Stories</span>
            </Link>

            <Link
              to="/create"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                isActive('/create') 
                  ? 'bg-primary-100 text-primary-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              <PenTool className="h-4 w-4" />
              <span>New Story</span>
            </Link>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header; 