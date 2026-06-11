import React from 'react';

function IncidentTimeline({ events }) {
  if (!events || events.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-state-icon">✓</span>
        <div className="empty-state-text">No incidents recorded</div>
      </div>
    );
  }

  return (
    <div className="timeline">
      {events.map((event) => (
        <div className="timeline-item" key={event.id}>
          <div className={`timeline-dot timeline-dot--${event.severity}`} />
          <div className="timeline-time">{event.time}</div>
          <div
            className="timeline-message"
            dangerouslySetInnerHTML={{ __html: event.message }}
          />
        </div>
      ))}
    </div>
  );
}

export default IncidentTimeline;
