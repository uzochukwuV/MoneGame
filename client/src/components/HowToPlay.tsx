export function HowToPlay() {
  const steps = [
    {
      number: 1,
      title: 'Connect Wallet',
      description: 'Connect your OneWallet to get started. Make sure you have OCT tokens for entry fees.'
    },
    {
      number: 2,
      title: 'Choose Your Arena',
      description: 'Select a tier based on your risk appetite. Higher tiers mean bigger prizes!'
    },
    {
      number: 3,
      title: 'Join the Battle',
      description: 'Wait for 10-50 players to join. Once full, the battle begins automatically.'
    },
    {
      number: 4,
      title: 'Vote with the Majority',
      description: 'Each round, a player asks a question. Vote for what you think most will choose!'
    },
    {
      number: 5,
      title: 'Survive & Win',
      description: 'Minority voters get eliminated. Survive 3 rounds to split the prize pool!'
    }
  ];

  return (
    <section className="how-to-play" id="rules">
      <div className="how-to-play-content">
        <div className="section-header">
          <h2>How to Play</h2>
          <p>Master the game in 5 simple steps</p>
        </div>

        <div className="steps-grid">
          {steps.map((step) => (
            <div key={step.number} className="step-card">
              <div className="step-number">{step.number}</div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </div>
          ))}
        </div>

        <div style={{ 
          marginTop: '4rem', 
          padding: '2rem',
          background: 'var(--bg-card)',
          borderRadius: '20px',
          border: '1px solid var(--border-accent)',
          textAlign: 'center'
        }}>
          <h3 style={{ marginBottom: '1rem' }}>Game Rules</h3>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1.5rem',
            textAlign: 'left',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <div>
              <p style={{ color: 'var(--primary-light)', fontWeight: 600, marginBottom: '0.5rem' }}>
                &#x2022; Majority Wins
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                The most popular answer survives. Think like the crowd!
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--primary-light)', fontWeight: 600, marginBottom: '0.5rem' }}>
                &#x2022; 3 Rounds
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Survive all 3 elimination rounds to win your share.
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--primary-light)', fontWeight: 600, marginBottom: '0.5rem' }}>
                &#x2022; 95% Prize Pool
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Winners split 95% of all entry fees. Only 5% platform fee.
              </p>
            </div>
            <div>
              <p style={{ color: 'var(--primary-light)', fontWeight: 600, marginBottom: '0.5rem' }}>
                &#x2022; Gasless Play
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                No gas fees during gameplay! Only pay entry fee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
