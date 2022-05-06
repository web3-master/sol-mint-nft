import { BrowserRouter } from "react-router-dom";
import WalletContextProvider from "./contexts/WalletContextProvider";
import AppLayout from "./layout/AppLayout";
import "@solana/wallet-adapter-react-ui/styles.css";
import "./App.css";

function App() {
  return (
    <BrowserRouter>
      <div className="App">
        <WalletContextProvider>
          <AppLayout />
        </WalletContextProvider>
      </div>
    </BrowserRouter>
  );
}

export default App;
