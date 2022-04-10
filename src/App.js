import { useRef, useEffect, useState } from 'react';
import Game from './Game';

function App() {
  const [loadingText, setLoadingText] = useState();
  const [loadingTextTimer, setLoadingTextTimer] = useState(0);

  let game = useRef();

  function showLoadingText(text, timer = -1) {
    console.log(text);
    setLoadingText(text);
    setLoadingTextTimer(timer);
  }

  useEffect(() => {
    console.log('initialize');
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
      setLoadingTextTimer((prev) => {
        return prev > 0 ? prev - 1 : prev;
      });
    }, 1000);
  }, []);

  return (
    <>
      <canvas id="game-canvas"></canvas>
      <div id="game-overlay">
        {loadingTextTimer !== 0 && (
          <p className="loading-text">{loadingText}</p>
        )}
      </div>
    </>
  );
}

export default App;
