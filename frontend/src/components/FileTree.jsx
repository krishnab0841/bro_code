export default function FileTree({ files, onFileClick }) {
  const getFileIcon = (path) => {
    const ext = path.split('.').pop().toLowerCase();
    const icons = {
      html: '🌐', htm: '🌐',
      css: '🎨', scss: '🎨', sass: '🎨',
      js: '⚡', jsx: '⚡', ts: '⚡', tsx: '⚡',
      py: '🐍',
      json: '📋',
      md: '📝',
      txt: '📄',
      svg: '🖼️', png: '🖼️', jpg: '🖼️',
      sql: '🗄️',
      env: '🔒',
    };
    return icons[ext] || '📄';
  };

  if (!files || files.length === 0) {
    return (
      <div className="file-tree-empty">
        <span className="icon">📂</span>
        <span>No files yet</span>
        <span style={{ fontSize: '12px', opacity: 0.6 }}>
          Generated files will appear here
        </span>
      </div>
    );
  }

  return (
    <div className="file-tree">
      {files.map((file, idx) => (
        <div
          key={file.path}
          className={`file-item ${idx === files.length - 1 ? 'new' : ''}`}
          onClick={() => onFileClick(file)}
          title={file.path}
        >
          <span className="file-icon">{getFileIcon(file.path)}</span>
          <span className="file-name">{file.path}</span>
        </div>
      ))}
    </div>
  );
}
