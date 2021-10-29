import * as sessionStore from './session-store'
import grant0 from 'grant'
import { APIGatewayProxyEventV2 } from 'aws-lambda/trigger/api-gateway-proxy'
import { dynamoDB } from '../tracedClients'

const grant = grant0.aws({
  config: {
    defaults: {
      origin: process.env.API_URL, // where your client server can be reached
      transport: 'session', //used to deliver the response in your callback
      state: true, // whether to generate random state string
    },
    slack: {
      key: process.env.SLACK_CLIENT_ID, //client_id
      secret: process.env.SLACK_SECRET,
      scope: ['incoming-webhook'],
      nonce: true,
      custom_params: { access_type: 'offline' },
      callback: '/connect/slack/on-complete', // where to get the callback from Slack
    },
  },
  session: { secret: 'grant', store: sessionStore },
})

let tableName: string = 'not set'
const tableFromEnvironment = (): string => {
  if (tableName === 'not set') {
    tableName = process.env.DYNAMO_TABLE_NAME || 'no env'
    if (tableName === 'not set' || !tableName) {
      throw new Error('must receive a dynamodb table name')
    }
  }
  return tableName
}

export const run = async (event: APIGatewayProxyEventV2) => {
  if (event.rawPath === '/connect/slack/on-complete') {
    const grantId = (event.cookies || [])
      .find((c) => c.startsWith('grant'))
      ?.split('=')[1]
      ?.split('.')[0]
    if (grantId) {
      const session = await sessionStore.get(grantId)
      const raw = session.grant.response.raw
      const tableName = tableFromEnvironment()
      const params = {
        TableName: tableName,
        Item: {
          webhook: { S: JSON.stringify(raw) },
          type: { S: 'webhook' },
          lookup: { S: grantId },
        },
      }
      await dynamoDB.putItem(params).promise()
      return {
        statusCode: 302,
        headers: {
          location: `https://${process.env.LANDING_PAGE}`,
        },
      }
    } else {
      console.error(event.cookies, 'no grant cookie')
      return { statusCode: 500 }
    }
  } else {
    const { redirect, response } = await grant(event)
    return (
      redirect || {
        statusCode: 200,
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(response),
      }
    )
  }
}
