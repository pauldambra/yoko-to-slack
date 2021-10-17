import { SQSEvent } from 'aws-lambda'
import { axios } from '../tracedClients'
import { Toot, TootMediaProcessing } from '../types'

const tootToBlock = (toot: Toot) => [
  {
    type: 'section',
    text: {
      type: 'mrkdwn',
      text: toot.text,
    },
  },
  ...toot.entities.media.map((m) => ({
    type: 'image',
    image_url: m.media_url_https,
    alt_text: 'another image',
  })),
]

export const run = async (event: SQSEvent) => {
  console.log({ event: JSON.stringify(event) })
  const slackUrl = process.env.SLACK_WEBHOOK_URL
  if (!slackUrl) {
    throw new Error('must receive a slack url from the environment')
  }

  await Promise.all(
    event.Records.map((r) => {
      const { toot } = JSON.parse(r.body) as TootMediaProcessing
      const blocks = tootToBlock(toot)
      const data = { text: toot.text, blocks: blocks }
      return axios.post(slackUrl, data, {
        headers: { contentType: 'application/json' },
      })
    })
  )
}
