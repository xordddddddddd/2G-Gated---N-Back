import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.headers['x-discord-token'] as string
  if (!token) {
    return res.status(400).json({ error: 'Missing x-discord-token header' })
  }

  try {
    // Fetch up to 200 guilds (Discord max per page)
    const response = await fetch(
      'https://discord.com/api/v10/users/@me/guilds?limit=200',
      {
        headers: {
          Authorization: token,
          'Content-Type': 'application/json',
        },
      },
    )
    const data = await response.json()
    return res.status(response.status).json(data)
  } catch {
    return res.status(500).json({ error: 'Failed to reach Discord API' })
  }
}
