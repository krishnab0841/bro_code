import { useRef } from 'react';

export default function PreviewPanel({ previewUrl, isGenerating }) {
  const iframeRef = useRef(null);

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = iframeRef.current.src;
    }
  };

  const handleOpenNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className="panel-right">
      <div className="preview-toolbar">
        <div className="preview-url">
          {previewUrl || 'No preview available'}
        </div>
        <button
          className="btn-icon"
          onClick={handleRefresh}
          disabled={!previewUrl}
          title="Refresh preview"
        >
          🔄
        </button>
        <button
          className="btn-icon"
          onClick={handleOpenNewTab}
          disabled={!previewUrl}
          title="Open in new tab"
        >
          ↗️
        </button>
      </div>

      {previewUrl ? (
        <iframe
          ref={iframeRef}
          className="preview-frame"
          src={previewUrl}
          sandbox="allow-scripts allow-same-origin"
          title="Project Preview"
        />
      ) : (
        <div className="preview-placeholder">
          <span className="icon">🖥️</span>
          <p>
            {isGenerating
              ? 'Your project is being generated...'
              : 'Your project will appear here'}
          </p>
          <span className="hint">
            {isGenerating
              ? 'The preview will load automatically when ready'
              : 'Enter a prompt and click Generate to start'}
          </span>
          {isGenerating && (
            <div className="spinner" style={{ marginTop: '8px' }} />
          )}
        </div>
      )}
    </div>
  );
}
