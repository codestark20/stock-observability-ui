import React, { useState } from 'react';
import { FiZoomOut, FiSearch } from 'react-icons/fi';

// Generates a color based on the function name to keep colors consistent
function getColor(name, isHighlighted, isDimmed) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash % 360);
  
  if (isHighlighted) return `hsl(${hue}, 80%, 60%)`; // Brighter for highlighted
  if (isDimmed) return `hsl(${hue}, 20%, 30%)`; // Dull and dark for dimmed
  return `hsl(${hue}, 60%, 40%)`; // Normal dark mode friendly colors
}

function FlamegraphNode({ node, totalValue, level = 0, onHover, onLeave, onClick, searchQuery }) {
  if (!node || typeof node.value === 'undefined') return null;

  const widthPercent = (node.value / totalValue) * 100;
  const isTooSmall = widthPercent < 0.5;

  const isMatch = searchQuery && node.name.toLowerCase().includes(searchQuery.toLowerCase());
  const isDimmed = searchQuery && !isMatch;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Current Node */}
      <div 
        style={{
          width: `${widthPercent}%`,
          height: '24px',
          backgroundColor: getColor(node.name, isMatch, isDimmed),
          border: isMatch ? '1px solid white' : '1px solid rgba(0,0,0,0.2)',
          borderRadius: '2px',
          color: isDimmed ? 'rgba(255,255,255,0.4)' : 'white',
          fontSize: '11px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          padding: '0 4px',
          transition: 'background-color 0.1s, border 0.1s',
          boxSizing: 'border-box'
        }}
        onMouseMove={(e) => onHover(node, e)}
        onMouseLeave={onLeave}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
      >
        {!isTooSmall && node.name}
      </div>

      {/* Children Container */}
      {node.children && node.children.length > 0 && (
        <div style={{ display: 'flex', width: `${widthPercent}%` }}>
          {node.children.map((child, idx) => (
            <div key={idx} style={{ width: `${(child.value / node.value) * 100}%` }}>
              <FlamegraphNode 
                node={child} 
                totalValue={child.value} 
                level={level + 1} 
                onHover={onHover}
                onLeave={onLeave}
                onClick={onClick}
                searchQuery={searchQuery}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Flamegraph({ profileData }) {
  const [zoomedNode, setZoomedNode] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const rootNode = zoomedNode || profileData;

  const handleHover = (node, e) => {
    // Tooltip offset
    const x = e.clientX + 10;
    const y = e.clientY + 10;
    setTooltip({ node, x, y });
  };

  const handleLeave = () => {
    setTooltip(null);
  };

  const handleClick = (node) => {
    // Prevent zooming into leaves that don't have children or are tiny, 
    // actually it's fine to zoom into anything, but reset tooltip.
    setZoomedNode(node);
    setTooltip(null);
  };

  return (
    <div className="flamegraph-container" style={{ position: 'relative', width: '100%' }}>
      
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ position: 'relative' }}>
            <FiSearch style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Find function..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '4px 8px 4px 28px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                outline: 'none',
                width: '200px'
              }}
            />
          </div>
          {zoomedNode && (
            <button 
              onClick={() => setZoomedNode(null)}
              style={{
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-primary)',
                padding: '4px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <FiZoomOut /> Reset Zoom
            </button>
          )}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Click to zoom in.
        </div>
      </div>

      <div style={{ 
        width: '100%', 
        overflowX: 'auto',
        background: 'var(--bg-secondary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)'
      }}>
        <div style={{ minWidth: '400px' }}>
          <FlamegraphNode 
            node={rootNode} 
            totalValue={rootNode.value} 
            onHover={handleHover}
            onLeave={handleLeave}
            onClick={handleClick}
            searchQuery={searchQuery}
          />
        </div>
      </div>
      
      {/* Floating Tooltip */}
      {tooltip && (
        <div style={{
          position: 'fixed',
          top: tooltip.y,
          left: tooltip.x,
          background: 'var(--bg-popover, #1e293b)',
          color: 'var(--text-primary, #fff)',
          border: '1px solid var(--border-default, #334155)',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000,
          pointerEvents: 'none',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <div style={{ fontWeight: '600', marginBottom: '4px', color: '#38bdf8' }}>{tooltip.node.name}</div>
          <div>Execution Time: <strong>{tooltip.node.value}ms</strong></div>
          {tooltip.node !== profileData && (
            <div style={{ color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
              {((tooltip.node.value / profileData.value) * 100).toFixed(1)}% of total execution
            </div>
          )}
        </div>
      )}
    </div>
  );
}
