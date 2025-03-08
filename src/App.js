import { Buffer } from 'buffer';
import React from 'react';
import './App.css';
import ExchangeModal from './ExchangeModal'; // Ваш компонент

if (!globalThis.Buffer) {
  globalThis.Buffer = Buffer;
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <ExchangeModal />
      </header>
    </div>
  );
}

export default App;
