import { useRef, useEffect, useState } from 'react';
import Game from './Game';

function App() {
  const [loadingText, setLoadingText] = useState();
  const [loadingTextTimer, setLoadingTextTimer] = useState(0);

  let game = useRef();

  function showLoadingText(text) {
    console.log(text);
    setLoadingText(text);
    setLoadingTextTimer(3);
  }

  useEffect(() => {
    console.log('initializing game');
    if (!game.current) {
      game.current = new Game(
        document.querySelector('#game-canvas'),
        showLoadingText
      );
    } else {
      // Force a reload
      window.location.reload();
    }

    // Loading text timer countdown
    setInterval(() => {
      setLoadingTextTimer((prev) => prev - 1);
    }, 1000);
  }, []);

  return (
    <>
      <canvas id="game-canvas"></canvas>
      <div id="game-overlay">
        {loadingTextTimer > 0 && <p className="loading-text">{loadingText}</p>}
      </div>
    </>
  );
}

export default App;
