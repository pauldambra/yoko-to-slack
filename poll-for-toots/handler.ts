import { SendMessageRequest } from 'aws-sdk/clients/sqs'
import { Toot } from '../types'
import { AxiosInstance } from 'axios'
import { axios, dynamoDB, sqs } from '../tracedClients'
import { cloudwatchCounter } from '../metrics-logger'

let twitterAPI: AxiosInstance

interface TootMetadata {
  max_id_str: string
}

interface TwitterSearchResponse {
  statuses: Toot[]
  search_metadata: TootMetadata
}

const requiredEnvironmentVariables = () => {
  const queueUrl = process.env.TOOTED_PHOTOS_QUEUE
  if (!queueUrl) {
    throw new Error('must receive a queue url')
  }

  const tableName = process.env.DYNAMO_TABLE_NAME
  if (!tableName) {
    throw new Error('must receive a dynamodb table name')
  }

  const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN

  if (!twitterBearerToken) {
    throw new Error(
      'must receive a twitter bearer token from the environment'
    )
  }
  return { queueUrl, tableName, twitterBearerToken }
}

export const run = async () => {
  const { queueUrl, tableName, twitterBearerToken } =
    requiredEnvironmentVariables()

  if (!twitterAPI) {
    twitterAPI = axios.create({
      headers: {
        Authorization: `Bearer ${twitterBearerToken}`,
      },
    })
  }

  const getResult = await dynamoDB
    .getItem({
      TableName: tableName,
      Key: {
        type: { S: 'twitter-page-id' },
        lookup: { S: 'twitter-page-id' },
      },
    })
    .promise()

  let searchURL =
    'https://api.twitter.com/1.1/search/tweets.json?q=from%3Apauldambra&result_type=recent'

  if (getResult?.Item) {
    const last_seen_toot_id = getResult.Item?.id?.S

    if (last_seen_toot_id) {
      searchURL += `&since_id=${last_seen_toot_id}`
    }
  }

  const response = await twitterAPI.get(searchURL)
  if (response.status !== 200) {
    console.error(JSON.stringify(response))
    throw new Error('cannot get from Twitter')
  }
  const { statuses, search_metadata } =
    response.data as TwitterSearchResponse

  const withPhotos = statuses.filter((s) =>
    s.entities?.media?.some((m) => m.type === 'photo')
  )

  await cloudwatchCounter(withPhotos.length, 'toots-with-photos', {
    Name: 'Toots',
    Value: 'polled and have photos',
  })

  await dynamoDB
    .putItem({
      TableName: tableName,
      Item: {
        id: { S: search_metadata.max_id_str },
        type: { S: 'twitter-page-id' },
        lookup: { S: 'twitter-page-id' },
      },
    })
    .promise()

  const sends = withPhotos.map((wp) => {
    const enqueueParams: SendMessageRequest = {
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(wp),
    }
    return sqs.sendMessage(enqueueParams).promise()
  })

  await Promise.all(sends)
}
