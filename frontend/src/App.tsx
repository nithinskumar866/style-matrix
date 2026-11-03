import { Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import { Login } from "./components/Login";

function App() { 
  return (
    <div className="min-h-screen bg-slate-50">
      <Routes>
        
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Dashboard />} />
      </Routes>
    </div>
  );
}

export default App;