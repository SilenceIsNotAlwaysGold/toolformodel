import React from 'react';
import { useNavigate } from 'react-router-dom';
import './Tools.css';

const toolsData = [
  { id: 1, name: '图片处理工具', icon: '🖼️', path: '/tools/image' },
  { id: 2, name: '文本转换工具', icon: '📝', path: '/tools/text' },
  { id: 3, name: '格式转换工具', icon: '🔄', path: '/tools/format' },
  { id: 4, name: '计算工具', icon: '🧮', path: '/tools/calculator' }
];

const ToolCard = React.memo(({ tool, onClick }) => (
  <div className="tool-card" onClick={() => onClick(tool.path)}>
    <div className="tool-icon">{tool.icon}</div>
    <div className="tool-name">{tool.name}</div>
  </div>
));

const Tools = () => {
  const navigate = useNavigate();

  const handleToolClick = (path) => {
    navigate(path);
  };

  return (
    <div className="tools-container">
      <h1>工具箱</h1>
      <div className="tools-grid">
        {toolsData.map(tool => (
          <ToolCard key={tool.id} tool={tool} onClick={handleToolClick} />
        ))}
      </div>
    </div>
  );
};

export default Tools; 