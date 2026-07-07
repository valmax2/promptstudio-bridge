/**
 * Sudoku Engine — generazione, validazione e risoluzione di schemi 9x9.
 * Nessuna dipendenza esterna. Esposto globalmente come `window.SudokuEngine`.
 */
(function (global) {
  const SIZE = 9;
  const BOX = 3;

  // Numero di celle "date" (indizi) per livello di difficoltà.
  // Meno indizi = più celle da dedurre = puzzle più difficile.
  const DIFFICULTY_CLUES = {
    easy: 40,
    medium: 32,
    hard: 26,
  };

  function emptyBoard() {
    return Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function findEmpty(board) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (board[r][c] === 0) return [r, c];
      }
    }
    return null;
  }

  // Verifica se `val` può essere piazzato in (row,col) senza violare le regole.
  function isSafe(board, row, col, val) {
    for (let i = 0; i < SIZE; i++) {
      if (board[row][i] === val || board[i][col] === val) return false;
    }
    const br = row - (row % BOX);
    const bc = col - (col % BOX);
    for (let r = 0; r < BOX; r++) {
      for (let c = 0; c < BOX; c++) {
        if (board[br + r][bc + c] === val) return false;
      }
    }
    return true;
  }

  // Riempie la board con una soluzione completa valida via backtracking randomizzato.
  function fillBoard(board) {
    const cell = findEmpty(board);
    if (!cell) return true;
    const [row, col] = cell;
    for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
      if (isSafe(board, row, col, n)) {
        board[row][col] = n;
        if (fillBoard(board)) return true;
        board[row][col] = 0;
      }
    }
    return false;
  }

  function generateSolved() {
    const board = emptyBoard();
    fillBoard(board);
    return board;
  }

  // Conta le soluzioni possibili di una board, fermandosi appena raggiunge `limit`
  // (serve solo a distinguere "unica soluzione" da "più soluzioni", non a enumerarle tutte).
  function countSolutions(board, limit) {
    let count = 0;
    const work = cloneBoard(board);

    function solve() {
      if (count >= limit) return;
      const cell = findEmpty(work);
      if (!cell) {
        count++;
        return;
      }
      const [row, col] = cell;
      for (let n = 1; n <= 9 && count < limit; n++) {
        if (isSafe(work, row, col, n)) {
          work[row][col] = n;
          solve();
          work[row][col] = 0;
        }
      }
    }

    solve();
    return count;
  }

  // Genera un puzzle per la difficoltà richiesta: parte da una soluzione completa
  // e rimuove celle una alla volta, mantenendo sempre soluzione unica.
  function generatePuzzle(difficulty) {
    const solution = generateSolved();
    const puzzle = cloneBoard(solution);
    const targetClues = DIFFICULTY_CLUES[difficulty] || DIFFICULTY_CLUES.medium;

    const positions = shuffle(
      Array.from({ length: SIZE * SIZE }, (_, i) => [Math.floor(i / SIZE), i % SIZE])
    );

    let clues = SIZE * SIZE;
    for (const [row, col] of positions) {
      if (clues <= targetClues) break;
      const backup = puzzle[row][col];
      puzzle[row][col] = 0;
      if (countSolutions(puzzle, 2) === 1) {
        clues--;
      } else {
        puzzle[row][col] = backup; // la rimozione rompe l'unicità: ripristina
      }
    }

    return { puzzle, solution, difficulty, clues };
  }

  // Coordinate di tutte le celle che confliggono con `val` in (row,col): stessa riga,
  // stessa colonna o stesso riquadro 3x3.
  function getConflictCells(board, row, col, val) {
    const conflicts = [];
    if (!val) return conflicts;
    for (let i = 0; i < SIZE; i++) {
      if (i !== col && board[row][i] === val) conflicts.push([row, i]);
      if (i !== row && board[i][col] === val) conflicts.push([i, col]);
    }
    const br = row - (row % BOX);
    const bc = col - (col % BOX);
    for (let r = 0; r < BOX; r++) {
      for (let c = 0; c < BOX; c++) {
        const rr = br + r, cc = bc + c;
        if ((rr !== row || cc !== col) && board[rr][cc] === val) conflicts.push([rr, cc]);
      }
    }
    return conflicts;
  }

  // Una board è "completa" quando ogni cella è piena e nessuna cella è in conflitto.
  function isBoardComplete(board) {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const v = board[r][c];
        if (v === 0 || getConflictCells(board, r, c, v).length > 0) return false;
      }
    }
    return true;
  }

  global.SudokuEngine = {
    SIZE,
    BOX,
    DIFFICULTY_CLUES,
    emptyBoard,
    cloneBoard,
    generateSolved,
    generatePuzzle,
    countSolutions,
    getConflictCells,
    isBoardComplete,
  };
})(typeof window !== 'undefined' ? window : globalThis);
