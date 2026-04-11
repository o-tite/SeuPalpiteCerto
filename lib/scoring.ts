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
): {
  points: number
  exactMatch: boolean
  winnerMatch: boolean
  drawMatch: boolean
  homeGoalsMatch: boolean
  awayGoalsMatch: boolean
} {
  const betResult = calcResultType(betHome, betAway)
  const actualResult = calcResultType(resultHome, resultAway)

  const exactMatch = betHome === resultHome && betAway === resultAway
  const correctResult = betResult === actualResult
  const winnerMatch = !exactMatch && correctResult && actualResult !== 'draw'
  const drawMatch = !exactMatch && correctResult && actualResult === 'draw'
  const homeGoalsMatch = betHome === resultHome
  const awayGoalsMatch = betAway === resultAway

  let points = 0
  if (exactMatch) {
    points = 15
  } else {
    if (correctResult) points += 5
    if (homeGoalsMatch) points += 5
    if (awayGoalsMatch) points += 5
  }

  return { points, exactMatch, winnerMatch, drawMatch, homeGoalsMatch, awayGoalsMatch }
}
