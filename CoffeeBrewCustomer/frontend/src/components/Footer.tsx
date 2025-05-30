
import React from 'react';
import { Coffee, Heart } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-coffee-dark text-cream py-8 mt-auto">
      <div className="max-w-6xl mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Brand Section */}
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-4">
              <Coffee className="w-6 h-6 text-yellow-300" />
              <span className="text-xl font-bold">CoffeeDelight</span>
            </div>
            <p className="text-amber-200 text-sm">
              Crafting exceptional coffee experiences since day one.
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center">
            <h4 className="font-semibold mb-4 text-yellow-300">Quick Links</h4>
            <div className="space-y-2">
              <a href="/" className="block text-amber-200 hover:text-yellow-300 transition-colors text-sm">Home</a>
              <a href="/menu" className="block text-amber-200 hover:text-yellow-300 transition-colors text-sm">Menu</a>
              <a href="/rewards" className="block text-amber-200 hover:text-yellow-300 transition-colors text-sm">My Rewards</a>
            </div>
          </div>

          {/* Contact Info */}
          <div className="text-center md:text-right">
            <h4 className="font-semibold mb-4 text-yellow-300">Connect</h4>
            <div className="space-y-2 text-sm text-amber-200">
              <p>📍 123 Coffee Street, Bean City</p>
              <p>📞 (555) 123-CAFE</p>
              <p>✉️ hello@coffeedelight.com</p>
            </div>
          </div>
        </div>

        <div className="border-t border-coffee-light mt-8 pt-6 text-center">
          <p className="text-amber-200 text-sm flex items-center justify-center gap-1">
            Made with <Heart className="w-4 h-4 text-red-400" /> by CoffeeDelight
            <span className="mx-2">•</span>
            © 2024 All rights reserved
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
