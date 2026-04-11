export type ResultType = 'home_win' | 'away_win' | 'draw'

export function calcResultType(homeScore: number, awayScore: number): ResultType {
  if (homeScore > awayScore) return 'home_win'
  if (awayScore > homeScore) return 'away_win'
  return 'draw'
}

export function calcScore(
  betHome: number,
  betAway: number,
  resultHome: number,
  resultAway: number
): { points: number; exactMatch: boolean; winnerMatch: boolean; drawMatch: boolean } {
  const betResult = calcResultType(betHome, betAway)
  const actualResult = calcResultType(resultHome, resultAway)

  const exactMatch = betHome === resultHome && betAway === resultAway
  const winnerMatch = !exactMatch && betResult === actualResult && actualResult !== 'draw'
  const drawMatch = !exactMatch && actualResult === 'draw' && betResult === 'draw'

  let points = 0
  if (exactMatch) points += 5
  if (winnerMatch) points += 5
  if (drawMatch) points += 5
  // exact match already gives 5 pts; if exact + correct winner = still 5 pts (exact covers winner)
  // Per spec: 5pts exact + 5pts winner + 5pts draw (max 15 per game)
  // But exact match means winner is also correct, so max real is 5+5=10 for exact home/away win
  // and 5+5=10 for exact draw (exact + draw bonus)
  if (exactMatch && actualResult !== 'draw') points += 5 // exact + winner correct
  if (exactMatch && actualResult === 'draw') points += 5 // exact + draw correct

  return { points, exactMatch, winnerMatch, drawMatch }
}
