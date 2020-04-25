import React from 'react';
import logo from './logo.svg';
import { Counter } from './features/counter/Counter';
import { Game } from './features/game/Game';
import './App.css';

function App() {
  return (
    <div className="App">
      <Game></Game>
    </div>
  );
}

export default App;
