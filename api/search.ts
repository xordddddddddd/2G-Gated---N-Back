import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers['x-discord-token'] as string
  if (!token) {
    return res.status(400).json({ error: 'Missing x-discord-token header' })
  }

  const { guildId, authorId, offset = '0' } = req.query

  if (!guildId || !authorId) {
    return res.status(400).json({ error: 'Missing guildId or authorId' })
  }

  try {
    const url = new URL(
      `https://discord.com/api/v10/guilds/${guildId}/messages/search`,
    )
    url.searchParams.set('author_id', authorId as string)
    url.searchParams.set('offset', offset as string)

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: token,
        'Content-Type': 'application/json',
      },
    })

    // Pass through rate-limit headers so the client can react
    const retryAfter = response.headers.get('retry-after')
    if (retryAfter) res.setHeader('retry-after', retryAfter)

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch {
    return res.status(500).json({ error: 'Failed to reach Discord API' })
  }
}
