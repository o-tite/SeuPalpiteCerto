export async function closeExpiredRound(
  supabase: any,
  roundId: string,
  closingAt: string,
  currentStatus: string
): Promise<string> {
  if (currentStatus !== 'open') return currentStatus

  const now = new Date()
  if (new Date(closingAt) > now) return currentStatus

  const { error } = await supabase
    .from('rounds')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .eq('id', roundId)

  return error ? currentStatus : 'closed'
}

export async function closeExpiredRounds(supabase: any) {
  const now = new Date().toISOString()
  await supabase
    .from('rounds')
    .update({ status: 'closed', updated_at: new Date().toISOString() })
    .lt('closing_at', now)
    .eq('status', 'open')
}

export async function finishRoundIfAllMatchesFinished(supabase: any, roundId: string) {
  const { data, error } = await supabase
    .from('matches')
    .select('status')
    .eq('round_id', roundId)

  if (error || !data || data.length === 0) return

  const allFinished = data.every((match: { status: string }) => match.status === 'finished')
  if (!allFinished) return

  await supabase
    .from('rounds')
    .update({ status: 'finished', updated_at: new Date().toISOString() })
    .eq('id', roundId)
}
