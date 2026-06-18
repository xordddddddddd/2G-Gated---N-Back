import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers['x-discord-token'] as string
  if (!token) {
    return res.status(400).json({ error: 'Missing x-discord-token header' })
  }

  const { channelId, messageId } = req.query

  if (!channelId || !messageId) {
    return res.status(400).json({ error: 'Missing channelId or messageId' })
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages/${messageId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      },
    )

    // Pass through rate-limit headers
    const retryAfter = response.headers.get('retry-after')
    if (retryAfter) res.setHeader('retry-after', retryAfter)

    if (response.status === 204) {
      return res.status(204).end()
    }

    // 404 means message is already gone — treat as success
    if (response.status === 404) {
      return res.status(204).end()
    }

    const data = await response.json()
    return res.status(response.status).json(data)
  } catch {
    return res.status(500).json({ error: 'Failed to reach Discord API' })
  }
}
