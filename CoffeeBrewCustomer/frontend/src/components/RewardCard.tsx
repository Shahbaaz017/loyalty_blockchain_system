
import React from 'react';
import { Button } from './ui/button';

interface Reward {
  id: string;
  name: string;
  pointsRequired: number;
  description?: string;
  icon?: string;
}

interface RewardCardProps {
  reward: Reward;
  userBalance: number;
  onRedeemClick: (rewardId: string) => void;
}

const RewardCard: React.FC<RewardCardProps> = ({ reward, userBalance, onRedeemClick }) => {
  const canRedeem = userBalance >= reward.pointsRequired;

  return (
    <div className="bg-gradient-to-br from-cream to-amber-50 rounded-lg border border-amber-200 p-6 shadow-md hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      {/* Reward Icon */}
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
          <span className="text-2xl">{reward.icon || '☕'}</span>
        </div>
        <h3 className="text-xl font-semibold text-amber-900 mb-2">{reward.name}</h3>
        {reward.description && (
          <p className="text-amber-700 text-sm mb-3 leading-relaxed">{reward.description}</p>
        )}
      </div>

      {/* Points Required */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 bg-white rounded-full px-4 py-2 border border-amber-300 shadow-sm">
          <div className="w-4 h-4 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-amber-900">C</span>
          </div>
          <span className="font-bold text-amber-800">{reward.pointsRequired} CFC</span>
        </div>
      </div>

      {/* Redeem Button */}
      <Button
        onClick={() => onRedeemClick(reward.id)}
        disabled={!canRedeem}
        className={`w-full py-3 rounded-lg font-semibold transition-all duration-200 ${
          canRedeem
            ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed border border-gray-300'
        }`}
      >
        {canRedeem ? 'Redeem Now' : `Need ${reward.pointsRequired - userBalance} more CFC`}
      </Button>

      {/* Insufficient Funds Indicator */}
      {!canRedeem && (
        <div className="mt-3 text-center">
          <p className="text-xs text-amber-600">
            Keep enjoying coffee to earn more CoffeeCoins!
          </p>
        </div>
      )}
    </div>
  );
};

export default RewardCard;
