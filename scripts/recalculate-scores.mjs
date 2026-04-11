import pkg from 'pg'
const { Client } = pkg

const POSTGRES_URL = process.env.POSTGRES_URL

if (!POSTGRES_URL) {
  console.error('Missing POSTGRES_URL environment variable')
  process.exit(1)
}

function calcResultType(homeScore, awayScore) {
  if (homeScore > awayScore) return 'home_win'
  if (awayScore > homeScore) return 'away_win'
  return 'draw'
}

function calcPoints(betHome, betAway, resultHome, resultAway) {
  const betResult = calcResultType(betHome, betAway)
  const actualResult = calcResultType(resultHome, resultAway)
  const exactMatch = betHome === resultHome && betAway === resultAway
  const correctResult = betResult === actualResult
  const homeGoalsMatch = betHome === resultHome
  const awayGoalsMatch = betAway === resultAway

  if (exactMatch) return { points: 15, exactMatch, winnerMatch: false, drawMatch: false }

  let points = 0
  if (correctResult) points += 5
  if (homeGoalsMatch) points += 5
  if (awayGoalsMatch) points += 5

  const winnerMatch = !exactMatch && correctResult && actualResult !== 'draw'
  const drawMatch = !exactMatch && correctResult && actualResult === 'draw'

  return { points, exactMatch, winnerMatch, drawMatch }
}

async function recalculate() {
  const client = new Client({
    connectionString: POSTGRES_URL,
    ssl: { rejectUnauthorized: false },
  })

  try {
    console.log('Connecting to database...')
    await client.connect()

    const query = `
      SELECT
        b.id AS bet_id,
        b.home_score AS bet_home,
        b.away_score AS bet_away,
        r.home_score AS result_home,
        r.away_score AS result_away
      FROM bets b
      JOIN matches m ON m.id = b.match_id
      JOIN results r ON r.match_id = m.id
    `

    const { rows } = await client.query(query)
    console.log(`Found ${rows.length} bets with results to recalculate.`)

    for (const row of rows) {
      const { points, exactMatch, winnerMatch, drawMatch } = calcPoints(
        row.bet_home,
        row.bet_away,
        row.result_home,
        row.result_away,
      )

      await client.query(
        `INSERT INTO scores (bet_id, points, exact_match, winner_match, draw_match, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (bet_id) DO UPDATE SET
           points = EXCLUDED.points,
           exact_match = EXCLUDED.exact_match,
           winner_match = EXCLUDED.winner_match,
           draw_match = EXCLUDED.draw_match,
           updated_at = EXCLUDED.updated_at`,
        [row.bet_id, points, exactMatch, winnerMatch, drawMatch],
      )
    }

    console.log('Recalculation finished successfully.')
  } catch (error) {
    console.error('Recalculation failed:', error.message)
    process.exit(1)
  } finally {
    await client.end()
  }
}

recalculate()
