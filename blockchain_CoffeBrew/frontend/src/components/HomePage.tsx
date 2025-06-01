
import React from 'react';
import { Link } from 'react-router-dom';
import { Coffee, Heart, Award, ArrowRight } from 'lucide-react';
import { Button } from './ui/button';

const HomePage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-coffee-brown to-coffee-dark text-cream py-20">
        <div className="max-w-6xl mx-auto px-4 text-center">
          <div className="mb-8">
            <Coffee className="w-16 h-16 text-yellow-300 mx-auto mb-4" />
            <h1 className="text-5xl md:text-6xl font-bold mb-6">
              Welcome to <span className="text-yellow-300">CoffeeDelight</span>
            </h1>
            <p className="text-xl md:text-2xl text-amber-100 mb-8 max-w-3xl mx-auto">
              Where every cup tells a story of craftsmanship, community, and pure coffee bliss
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/menu">
              <Button 
                size="lg" 
                className="bg-yellow-600 hover:bg-yellow-700 text-coffee-dark font-semibold px-8 py-3 text-lg"
              >
                View Our Menu
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/rewards">
              <Button 
                variant="outline" 
                size="lg"
                className="border-yellow-300 text-yellow-300 hover:bg-yellow-300 hover:text-coffee-dark font-semibold px-8 py-3 text-lg"
              >
                Join Rewards
                <Award className="w-5 h-5 ml-2" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section className="py-16 bg-white">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-coffee-brown mb-4">Our Story</h2>
            <p className="text-lg text-coffee-light max-w-3xl mx-auto">
              Founded in the heart of the city, CoffeeDelight has been serving exceptional coffee 
              and creating memorable experiences for coffee lovers since day one.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 bg-cream rounded-lg border border-amber-200 shadow-sm">
              <Coffee className="w-12 h-12 text-coffee-brown mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-coffee-brown mb-3">Premium Quality</h3>
              <p className="text-coffee-light">
                We source the finest beans from sustainable farms around the world, 
                ensuring every cup meets our high standards.
              </p>
            </div>

            <div className="text-center p-6 bg-cream rounded-lg border border-amber-200 shadow-sm">
              <Heart className="w-12 h-12 text-coffee-brown mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-coffee-brown mb-3">Community First</h3>
              <p className="text-coffee-light">
                More than just a coffee shop, we're a gathering place where neighbors 
                become friends and ideas come to life.
              </p>
            </div>

            <div className="text-center p-6 bg-cream rounded-lg border border-amber-200 shadow-sm">
              <Award className="w-12 h-12 text-coffee-brown mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-coffee-brown mb-3">Rewards Program</h3>
              <p className="text-coffee-light">
                Earn CoffeeCoins with every purchase and redeem them for your favorite treats. 
                Loyalty has never tasted so good!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-amber-100 to-orange-100">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-coffee-brown mb-6">
            Ready to Start Your Coffee Journey?
          </h2>
          <p className="text-lg text-coffee-light mb-8">
            Join thousands of coffee lovers who trust CoffeeDelight for their daily dose of perfection.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/menu">
              <Button 
                size="lg" 
                className="bg-coffee-brown hover:bg-coffee-dark text-cream font-semibold px-8 py-3"
              >
                Explore Menu
              </Button>
            </Link>
            <Link to="/rewards">
              <Button 
                variant="outline" 
                size="lg"
                className="border-coffee-brown text-coffee-brown hover:bg-coffee-brown hover:text-cream font-semibold px-8 py-3"
              >
                Start Earning Rewards
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;
