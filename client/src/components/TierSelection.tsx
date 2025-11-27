import { Tier, TIER_FEES, TIER_NAMES } from '../types/game';

interface TierSelectionProps {
  onSelectTier: (tier: Tier) => void;
  walletConnected: boolean;
}

const tierDescriptions: Record<Tier, string> = {
  [Tier.TIER_1]: 'Perfect for beginners. Low stakes, high fun!',
  [Tier.TIER_2]: 'Step up your game with moderate stakes.',
  [Tier.TIER_3]: 'For serious players seeking real competition.',
  [Tier.TIER_4]: 'High stakes battles for the bold.',
  [Tier.TIER_5]: 'Whale territory. Massive prizes await!',
};

const tierColors: Record<Tier, string> = {
  [Tier.TIER_1]: '#4CAF50',
  [Tier.TIER_2]: '#2196F3',
  [Tier.TIER_3]: '#9C27B0',
  [Tier.TIER_4]: '#FF9800',
  [Tier.TIER_5]: '#F44336',
};

export function TierSelection({ onSelectTier, walletConnected }: TierSelectionProps) {
  return (
    <section className="tier-selection" id="play">
      <div className="section-header">
        <h2>Choose Your Battle Arena</h2>
        <p>Select a tier based on your risk appetite. Higher tiers = bigger prizes!</p>
      </div>

      <div className="tier-grid">
        {Object.values(Tier).filter(t => typeof t === 'number').map((tier) => (
          <div 
            key={tier} 
            className="tier-card"
            style={{ '--tier-color': tierColors[tier as Tier] } as React.CSSProperties}
          >
            <div className="tier-badge">{TIER_NAMES[tier as Tier]}</div>
            <div className="tier-fee">
              <span className="fee-amount">{TIER_FEES[tier as Tier]}</span>
              <span className="fee-currency">OCT</span>
            </div>
            <p className="tier-description">{tierDescriptions[tier as Tier]}</p>
            <div className="tier-stats">
              <div className="stat">
                <span className="stat-label">Players</span>
                <span className="stat-value">10-50</span>
              </div>
              <div className="stat">
                <span className="stat-label">Rounds</span>
                <span className="stat-value">3</span>
              </div>
              <div className="stat">
                <span className="stat-label">Prize</span>
                <span className="stat-value">95%</span>
              </div>
            </div>
            <button 
              className="tier-button"
              onClick={() => onSelectTier(tier as Tier)}
              disabled={!walletConnected}
            >
              {walletConnected ? 'Join Battle' : 'Connect Wallet'}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
