import { useEffect, useRef } from 'react';

export default function AgentLog({ logs, isGenerating }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  if (logs.length === 0 && !isGenerating) {
    return (
      <div className="agent-log-empty">
        <span className="icon">🤖</span>
        <span>Agent activity will appear here</span>
        <span style={{ fontSize: '12px', opacity: 0.6 }}>
          Type a prompt and click Generate to start
        </span>
      </div>
    );
  }

  return (
    <div className="agent-log">
      {logs.map((log, idx) => (
        <div key={idx} className="log-entry">
          <span className={`log-badge ${log.agent || 'system'}`}>
            {log.agent || 'system'}
          </span>
          <span className="log-message">{log.message}</span>
          <span className="log-timestamp">{formatTime(log.timestamp)}</span>
        </div>
      ))}

      {isGenerating && (
        <div className="generating-indicator">
          <div className="spinner" />
          <span>Agents are working...</span>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
