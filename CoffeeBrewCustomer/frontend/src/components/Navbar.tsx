
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Coffee, User, LogOut } from 'lucide-react';
import { Button } from './ui/button';

interface NavbarProps {
  isAuthenticated?: boolean;
  onLogin?: () => void;
  onLogout?: () => void;
  userEmail?: string;
}

const Navbar: React.FC<NavbarProps> = ({ 
  isAuthenticated = false, 
  onLogin, 
  onLogout, 
  userEmail 
}) => {
  const location = useLocation();

  const isActiveRoute = (path: string) => location.pathname === path;

  return (
    <nav className="bg-gradient-to-r from-coffee-brown to-coffee-dark shadow-lg border-b border-amber-200">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
            <Coffee className="w-8 h-8 text-yellow-300" />
            <span className="text-2xl font-bold text-cream">CoffeeDelight</span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-8">
            <Link 
              to="/" 
              className={`text-cream hover:text-yellow-300 transition-colors font-medium ${
                isActiveRoute('/') ? 'text-yellow-300 border-b-2 border-yellow-300 pb-1' : ''
              }`}
            >
              Home
            </Link>
            <Link 
              to="/menu" 
              className={`text-cream hover:text-yellow-300 transition-colors font-medium ${
                isActiveRoute('/menu') ? 'text-yellow-300 border-b-2 border-yellow-300 pb-1' : ''
              }`}
            >
              Menu
            </Link>
            <Link 
              to="/rewards" 
              className={`text-cream hover:text-yellow-300 transition-colors font-medium ${
                isActiveRoute('/rewards') ? 'text-yellow-300 border-b-2 border-yellow-300 pb-1' : ''
              }`}
            >
              My Rewards
            </Link>
          </div>

          {/* Auth Section */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="flex items-center space-x-3">
                {userEmail && (
                  <span className="text-cream text-sm hidden sm:block">
                    Welcome, {userEmail.split('@')[0]}!
                  </span>
                )}
                <Button
                  onClick={onLogout}
                  variant="outline"
                  size="sm"
                  className="bg-transparent border-yellow-300 text-yellow-300 hover:bg-yellow-300 hover:text-coffee-dark"
                >
                  <LogOut className="w-4 h-4 mr-1" />
                  Logout
                </Button>
              </div>
            ) : (
              <Button
                onClick={onLogin}
                variant="outline"
                size="sm"
                className="bg-transparent border-yellow-300 text-yellow-300 hover:bg-yellow-300 hover:text-coffee-dark"
              >
                <User className="w-4 h-4 mr-1" />
                Login
              </Button>
            )}
          </div>

          {/* Mobile Menu Button (for future mobile implementation) */}
          <div className="md:hidden">
            <Coffee className="w-6 h-6 text-yellow-300" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
