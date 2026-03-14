import React from 'react';
import Editor from '@monaco-editor/react';

const CodeEditor = ({ language, code, onChange }) => {
  
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
    minimap: { enabled: false }, // Saves screen space for labs
    automaticLayout: true,       // Resizes when window changes
    scrollBeyondLastLine: false,
    theme: "vs-dark",
    padding: { top: 10 }
  };

  return (
    <div className="editor-container" style={{ border: '1px solid #444', borderRadius: '8px', overflow: 'hidden' }}>
      <Editor
        height="70vh"
        theme="vs-dark"
        language={languageMap[language] || language}
        value={code}
        options={editorOptions}
        onChange={(value) => onChange(value)}
      />
    </div>
  );
};

export default CodeEditor;