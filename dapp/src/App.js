import { BrowserRouter } from "react-router-dom";
import "./App.css";
import AppLayout from "./layout/AppLayout";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <AppLayout />
      </div>
    </BrowserRouter>
  );
}

export default App;
