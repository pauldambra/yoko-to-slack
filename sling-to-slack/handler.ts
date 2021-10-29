import { SQSEvent } from 'aws-lambda'
import { axios, dynamoDB } from '../tracedClients'
import { Toot, TootMediaProcessing } from '../types'
import { QueryInput } from 'aws-sdk/clients/dynamodb'

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

const tableName = process.env.DYNAMO_TABLE_NAME
if (!tableName) {
  throw new Error('must receive dynamo table name')
}

export const run = async (event: SQSEvent) => {
  console.log({ event: JSON.stringify(event) })

  const queryParams: QueryInput = {
    TableName: tableName,
    ExpressionAttributeNames: { '#type': 'type' },
    KeyConditionExpression: '#type = :t',
    ExpressionAttributeValues: {
      ':t': { S: 'webhook' },
    },
  }
  const getResult = await dynamoDB.query(queryParams).promise()
  const subscribers = (getResult?.Items || []).map((i) => {
    const x = JSON.parse(<string>i?.webhook?.S)
    return {
      accessToken: x.access_token,
      slackUrl: x.incoming_webhook.url,
    }
  })
  console.log({ getResult, subscribers })

  await Promise.all(
    event.Records.flatMap((r) => {
      return subscribers.map((s) => {
        const { toot } = JSON.parse(r.body) as TootMediaProcessing
        const blocks = tootToBlock(toot)
        const data = { text: toot.text, blocks: blocks }
        return axios.post(s.slackUrl, data, {
          headers: {
            contentType: 'application/json',
            Authorization: `Bearer ${s.accessToken}`,
          },
        })
      })
    })
  )
}
