export default function LoadingSteps({ steps, currentStep, accentColor = '#2EE8A0', title }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8">
      {title && (
        <div className="mb-8 text-center">
          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#4A5E4C', marginBottom: '4px' }}>RUNNING ANALYSIS</p>
          <p style={{ fontSize: '15px', fontWeight: 500, color: '#E8EDE9' }}>{title}</p>
        </div>
      )}
      <div className="flex flex-col gap-3 w-full max-w-sm">
        {steps.map((step, i) => {
          const done = i < currentStep;
          const active = i === currentStep;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center">
                {done ? (
                  <span style={{ color: accentColor, fontSize: '13px' }}>✓</span>
                ) : active ? (
                  <div className="w-2 h-2 rounded-full pulse-dot" style={{ background: accentColor }} />
                ) : (
                  <div className="w-2 h-2 rounded-full" style={{ background: '#222922' }} />
                )}
              </div>
              <span style={{
                fontSize: '13px',
                color: done ? '#4A5E4C' : active ? '#E8EDE9' : '#4A5E4C',
                fontFamily: done || active ? 'inherit' : 'inherit',
                transition: 'color 0.3s'
              }}>
                {step}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}