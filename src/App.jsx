import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Tools from './pages/Tools';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/tools" element={<Tools />} />
        {/* 其他路由 */}
      </Routes>
    </Router>
  );
}

export default App; 