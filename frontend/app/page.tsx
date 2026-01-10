import Link from "next/link";
import { TIER_NAMES, TIER_FEES, Tier } from "@/lib/constants";

export default function Home() {
  const tiers = [
    { tier: Tier.TIER_1, icon: "🎮", desc: "Perfect for beginners", color: "#10b981" },
    { tier: Tier.TIER_2, icon: "⚡", desc: "Quick matches", color: "#3b82f6" },
    { tier: Tier.TIER_3, icon: "🎯", desc: "Competitive play", color: "#8b5cf6" },
    { tier: Tier.TIER_4, icon: "👑", desc: "High stakes", color: "#f59e0b" },
    { tier: Tier.TIER_5, icon: "💎", desc: "Ultimate challenge", color: "#ef4444" },
  ];

  return (
    <div style={{ maxWidth: '1280px', margin: '0 auto', padding: '3rem 1.5rem' }}>
      {/* Hero Section */}
      <section style={{ textAlign: 'center', padding: '5rem 0', animation: 'fadeIn 0.3s ease-out' }}>
        <h1 style={{
          fontSize: '3.75rem',
          fontWeight: 'bold',
          marginBottom: '1.5rem',
          background: 'linear-gradient(to right, white, #9ca3af)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
          Majority Rules
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#9ca3af', marginBottom: '1rem', maxWidth: '42rem', margin: '0 auto 1rem' }}>
          A social deduction game where consensus wins. Outsmart saboteurs, survive elimination,
          and claim the prize pool.
        </p>
        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '3rem' }}>
          Powered by OneChain • Gas-Free Transactions
        </p>

        {/* CTA Buttons */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/discover/1"
            style={{
              padding: '1rem 2rem',
              backgroundColor: '#10b981',
              color: 'black',
              fontWeight: 'bold',
              borderRadius: '0.5rem',
              textDecoration: 'none',
              transition: 'all 0.2s',
              boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)',
              display: 'inline-block'
            }}
          >
            Start Playing
          </Link>
          <Link
            href="/how-to-play"
            style={{
              padding: '1rem 2rem',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              color: 'white',
              fontWeight: '600',
              borderRadius: '0.5rem',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              textDecoration: 'none',
              transition: 'all 0.2s',
              display: 'inline-block'
            }}
          >
            How to Play
          </Link>
        </div>
      </section>

      {/* Tier Selection */}
      <section style={{ padding: '4rem 0' }}>
        <h2 style={{ fontSize: '1.875rem', fontWeight: 'bold', textAlign: 'center', marginBottom: '3rem', color: 'white' }}>
          Choose Your Tier
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          maxWidth: '90rem',
          margin: '0 auto'
        }}>
          {tiers.map(({ tier, icon, desc, color }) => (
            <Link
              key={tier}
              href={`/discover/${tier}`}
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '0.75rem',
                border: `1px solid ${color}30`,
                padding: '1.5rem',
                textDecoration: 'none',
                transition: 'all 0.2s',
                display: 'block'
              }}
            >
              <div style={{ fontSize: '2.5rem', marginBottom: '1rem', transition: 'transform 0.2s' }}>
                {icon}
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>
                {TIER_NAMES[tier]}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#9ca3af', marginBottom: '1rem' }}>
                {desc}
              </p>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
                <span style={{ fontSize: '1.5rem', fontWeight: 'bold', color }}>
                  {(TIER_FEES[tier] / 1_000_000_000).toFixed(tier === Tier.TIER_1 ? 2 : 0)}
                </span>
                <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>OCT</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section style={{ padding: '4rem 0', maxWidth: '64rem', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🎭</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>
              Social Deduction
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Citizen or Saboteur? Work together to find consensus or disrupt the game.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>⚡</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>
              Gas-Free Play
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              All game actions are sponsored. Play without worrying about gas fees.
            </p>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🏆</div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'white' }}>
              Win Prizes
            </h3>
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>
              Survive to the end and split the prize pool with other winners.
            </p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{
        padding: '4rem 2rem',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '1rem',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        maxWidth: '64rem',
        margin: '0 auto'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '2rem', textAlign: 'center' }}>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#6366f1', marginBottom: '0.5rem' }}>
              1,234
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Games Played
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#8b5cf6', marginBottom: '0.5rem' }}>
              567
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Active Players
            </div>
          </div>
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#10b981', marginBottom: '0.5rem' }}>
              890
            </div>
            <div style={{ fontSize: '0.875rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OCT in Prizes
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
