import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ language, code, onChange, isDriver }) => {
  
  // Mapping frontend names to Monaco-supported IDs
  const languageMap = {
    "javascript": "javascript",
    "python": "python",
    "java": "java",
    "cpp": "cpp",
    "node": "javascript"
  };

  const editorOptions = {
    fontSize: 16,
    minimap: { enabled: false }, 
    automaticLayout: true,       
    scrollBeyondLastLine: false,
    theme: "vs-dark",
    padding: { top: 10 },
    // CRITICAL: Prevent non-drivers from typing
    readOnly: !isDriver, 
    domReadOnly: !isDriver,
    cursorStyle: isDriver ? "line" : "block-outline",
  };

  return (
    <div className="editor-container" style={{ 
      border: '1px solid #444', 
      borderRadius: '8px', 
      overflow: 'hidden',
      position: 'relative' 
    }}>
      {/* Visual indicator for "View Only" mode */}
      {!isDriver && (
        <div style={{
          position: 'absolute',
          top: '10px',
          right: '20px',
          zIndex: 10,
          background: 'rgba(255, 0, 0, 0.2)',
          color: '#ff4d4d',
          padding: '2px 8px',
          borderRadius: '4px',
          fontSize: '12px',
          fontWeight: 'bold',
          pointerEvents: 'none'
        }}>
          VIEW ONLY (Request Driver Token)
        </div>
      )}

      <Editor
        height="70vh"
        theme="vs-dark"
        language={languageMap[language] || language}
        value={code}
        options={editorOptions}
        onChange={(value) => {
          // Only trigger change if the user is the driver
          if (isDriver) {
            onChange(value);
          }
        }}
      />
    </div>
  );
};

export default CodeEditor;