const ORDER = [3, 2, 4, 1, 5, 0, 6];
const dropRow = (board: number[][], col: number) => {
  for (let row = 5; row >= 0; row--) if (board[row]![col] === 0) return row;
  return -1;
};
function won(board: number[][], token: number): boolean {
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      if ([0, 1, 2, 3].every(n => board[r + dr! * n]?.[c + dc! * n] === token)) return true;
    }
  }
  return false;
}
function score(board: number[][]): number {
  let total = board.reduce((sum, row) => sum + (row[3] === 2 ? 5 : row[3] === 1 ? -5 : 0), 0);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 7; c++) {
    for (const [dr, dc] of [[0, 1], [1, 0], [1, 1], [1, -1]]) {
      const window: Array<number | undefined> = [0, 1, 2, 3].map(n => board[r + dr! * n]?.[c + dc! * n]);
      if (window.includes(undefined)) continue;
      const bot = window.filter(x => x === 2).length, human = window.filter(x => x === 1).length;
      if (!human) total += [0, 1, 8, 60, 100000][bot]!;
      if (!bot) total -= [0, 1, 10, 80, 100000][human]!;
    }
  }
  return total;
}

/** Alpha-beta search, up to six plies with a hard node budget. No model/API. */
export function chooseBotColumn(input: number[][]): number {
  const board = input.map(row => [...row]);
  const legal = ORDER.filter(col => dropRow(board, col) >= 0);
  if (!legal.length) return -1;
  for (const token of [2, 1]) for (const col of legal) {
    const row = dropRow(board, col);
    board[row]![col] = token;
    const wins = won(board, token);
    board[row]![col] = 0;
    if (wins) return col;
  }
  let nodes = 0, best = legal[0]!;
  const deadline = Date.now() + 120;
  const search = (depth: number, maximizing: boolean, alpha: number, beta: number): number => {
    if (++nodes > 30000 || (nodes % 128 === 0 && Date.now() > deadline)) throw new Error("search-budget");
    if (won(board, 2)) return 100000 + depth;
    if (won(board, 1)) return -100000 - depth;
    const moves = ORDER.filter(col => dropRow(board, col) >= 0);
    if (!moves.length) return 0;
    if (!depth) return score(board);
    let value = maximizing ? -Infinity : Infinity;
    for (const col of moves) {
      const row = dropRow(board, col);
      board[row]![col] = maximizing ? 2 : 1;
      let result: number;
      try { result = search(depth - 1, !maximizing, alpha, beta); }
      finally { board[row]![col] = 0; }
      value = maximizing ? Math.max(value, result) : Math.min(value, result);
      if (maximizing) alpha = Math.max(alpha, value); else beta = Math.min(beta, value);
      if (alpha >= beta) break;
    }
    return value;
  };
  for (let depth = 2; depth <= 6; depth++) {
    let candidate = best, highest = -Infinity;
    try {
      for (const col of legal) {
        const row = dropRow(board, col);
        board[row]![col] = 2;
        let value: number;
        try { value = search(depth - 1, false, highest, Infinity); }
        finally { board[row]![col] = 0; }
        if (value > highest) { highest = value; candidate = col; }
      }
      best = candidate;
    } catch { break; } // Keep the last fully evaluated depth.
  }
  return best;
}
