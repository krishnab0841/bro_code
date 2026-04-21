import { useState, useCallback } from 'react';
import FileTree from './components/FileTree';
import AgentLog from './components/AgentLog';
import PreviewPanel from './components/PreviewPanel';
import FileModal from './components/FileModal';

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [agentLogs, setAgentLogs] = useState([]);
  const [fileTree, setFileTree] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, isError = false) => {
    setToast({ message, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim() || isGenerating) return;

    setIsGenerating(true);
    setAgentLogs([]);
    setFileTree([]);
    setPreviewUrl('');

    // Add initial system log
    setAgentLogs([{
      agent: 'system',
      message: '🚀 Starting project generation...',
      timestamp: new Date().toISOString(),
    }]);

    try {
      // Step 1: Start the generation job
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim() }),
      });

      if (!res.ok) {
        throw new Error(`Server error: ${res.status}`);
      }

      const { job_id } = await res.json();

      // Step 2: Open SSE stream for this job
      const eventSource = new EventSource(`/api/stream/${job_id}`);

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.type === 'heartbeat') return;

          if (data.type === 'agent') {
            setAgentLogs((prev) => [
              ...prev,
              {
                agent: data.agent,
                message: data.message,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (data.type === 'file_created') {
            setFileTree((prev) => {
              // Avoid duplicates (overwrite)
              const filtered = prev.filter((f) => f.path !== data.path);
              return [...filtered, { path: data.path, content: data.content }];
            });

            // Auto-set preview for html files
            if (data.path.endsWith('.html') || data.path === 'index.html') {
              setPreviewUrl(`/preview/${data.path}`);
            }

            setAgentLogs((prev) => [
              ...prev,
              {
                agent: 'system',
                message: `📁 File created: ${data.path}`,
                timestamp: new Date().toISOString(),
              },
            ]);
          } else if (data.type === 'done') {
            setIsGenerating(false);
            setAgentLogs((prev) => [
              ...prev,
              {
                agent: 'system',
                message: data.message || '✅ Project generated!',
                timestamp: new Date().toISOString(),
              },
            ]);
            showToast('Project generated successfully!');
            eventSource.close();
          } else if (data.type === 'error') {
            setIsGenerating(false);
            setAgentLogs((prev) => [
              ...prev,
              {
                agent: 'error',
                message: `❌ Error: ${data.message}`,
                timestamp: new Date().toISOString(),
              },
            ]);
            showToast(data.message, true);
            eventSource.close();
          }
        } catch (parseErr) {
          console.error('SSE parse error:', parseErr);
        }
      };

      eventSource.onerror = () => {
        setIsGenerating(false);
        eventSource.close();
      };
    } catch (err) {
      setIsGenerating(false);
      showToast(err.message, true);
      setAgentLogs((prev) => [
        ...prev,
        {
          agent: 'error',
          message: `❌ ${err.message}`,
          timestamp: new Date().toISOString(),
        },
      ]);
    }
  }, [prompt, isGenerating]);

  const handleNewProject = async () => {
    try {
      await fetch('/api/reset', { method: 'DELETE' });
    } catch {
      // ignore
    }
    setPrompt('');
    setAgentLogs([]);
    setFileTree([]);
    setPreviewUrl('');
    setSelectedFile(null);
    setIsGenerating(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="app-container">
      {/* HEADER */}
      <header className="header">
        <div className="header-logo">
          <span className="sparkle">✨</span>
          <span>Bro Code</span>
        </div>

        <div className="header-status">
          <span
            className={`status-dot ${
              isGenerating ? 'generating' : fileTree.length > 0 ? 'active' : ''
            }`}
          />
          <span>
            {isGenerating
              ? 'Generating...'
              : fileTree.length > 0
              ? 'Ready'
              : 'Idle'}
          </span>
        </div>

        <div className="header-actions">
          <button className="btn btn-secondary" onClick={handleNewProject}>
            ✨ New Project
          </button>
        </div>
      </header>

      {/* MAIN 3-PANEL LAYOUT */}
      <div className="main-content">
        {/* LEFT PANEL — File Tree */}
        <div className="panel-left">
          <div className="panel-header">
            <span className="panel-title">📁 Files</span>
            {fileTree.length > 0 && (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {fileTree.length} file{fileTree.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <FileTree files={fileTree} onFileClick={setSelectedFile} />
        </div>

        {/* CENTER PANEL — Prompt + Agent Logs */}
        <div className="panel-center">
          <div className="prompt-section">
            <div className="prompt-input-group">
              <textarea
                className="prompt-textarea"
                placeholder="Describe your project... e.g. Create a modern to-do app with HTML, CSS, and JavaScript"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={2}
                disabled={isGenerating}
              />
              <button
                className="btn btn-primary"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
              >
                {isGenerating ? (
                  <>
                    <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} />
                    Running
                  </>
                ) : (
                  '🚀 Generate'
                )}
              </button>
            </div>
          </div>

          <div className="panel-header">
            <span className="panel-title">🤖 Agent Activity</span>
          </div>
          <AgentLog logs={agentLogs} isGenerating={isGenerating} />
        </div>

        {/* RIGHT PANEL — Preview */}
        <PreviewPanel previewUrl={previewUrl} isGenerating={isGenerating} />
      </div>

      {/* FILE MODAL */}
      {selectedFile && (
        <FileModal file={selectedFile} onClose={() => setSelectedFile(null)} />
      )}

      {/* TOAST */}
      {toast && (
        <div className={`toast ${toast.isError ? 'error' : ''}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
