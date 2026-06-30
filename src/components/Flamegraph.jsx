import React, { useState } from 'react';

// Generates a color based on the function name to keep colors consistent
function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  return `hsl(${hue}, 70%, 40%)`; // Dark mode friendly colors
}

function FlamegraphNode({ node, totalValue, level = 0 }) {
  const [isHovered, setIsHovered] = useState(false);
  
  if (!node || typeof node.value === 'undefined') return null;

  const widthPercent = (node.value / totalValue) * 100;
  const isTooSmall = widthPercent < 5;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Current Node */}
      <div 
        style={{
          width: `${widthPercent}%`,
          height: '24px',
          backgroundColor: isHovered ? `hsl(${Math.abs(node.name.length * 10 % 360)}, 80%, 50%)` : getColor(node.name),
          border: '1px solid rgba(0,0,0,0.2)',
          borderRadius: '2px',
          color: 'white',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          padding: '0 4px',
          transition: 'background-color 0.1s'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={`${node.name} (${node.value}ms / ${widthPercent.toFixed(1)}%)`}
      >
        {!isTooSmall && node.name}
      </div>

      {/* Children Container */}
      {node.children && node.children.length > 0 && (
        <div style={{ display: 'flex', width: `${widthPercent}%` }}>
          {node.children.map((child, idx) => (
            <div key={idx} style={{ width: `${(child.value / node.value) * 100}%` }}>
              <FlamegraphNode node={child} totalValue={child.value} level={level + 1} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Flamegraph({ profileData }) {
  if (!profileData || !profileData.value) {
    return (
      <div style={{ 
        padding: '24px', 
        textAlign: 'center', 
        color: 'var(--text-muted)', 
        fontSize: '13px',
        border: '1px dashed var(--border-default)',
        borderRadius: 'var(--radius-sm)'
      }}>
        No profiling data available. 
        Send pprof or JSON tree payloads to the profiles API to render flamegraphs.
      </div>
    );
  }

  return (
    <div className="flamegraph-container" style={{ 
      width: '100%', 
      overflowX: 'auto',
      padding: '12px',
      background: 'var(--bg-secondary)',
      borderRadius: 'var(--radius-md)'
    }}>
      <div style={{ minWidth: '400px' }}>
        <FlamegraphNode node={profileData} totalValue={profileData.value} />
      </div>
      
      <div style={{ marginTop: '16px', fontSize: '12px', color: 'var(--text-secondary)' }}>
        Hover over blocks to view function details and execution time. Width represents time spent.
      </div>
    </div>
  );
}
