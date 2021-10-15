import * as AWSXRay from 'aws-xray-sdk-core'
import http from 'http'
import https from 'https'
// import { Context, EventBridgeEvent } from 'aws-lambda'

import axios, { AxiosInstance } from 'axios'

import DynamoDB, { GetItemInput, PutItemInput } from 'aws-sdk/clients/dynamodb'
import Sqs, { SendMessageRequest } from "aws-sdk/clients/sqs";

AWSXRay.captureHTTPsGlobal(http)
AWSXRay.captureHTTPsGlobal(https)

const ddb = new DynamoDB()
const sqs = new Sqs()


let twitterAPI: AxiosInstance

interface TootMedia {
  id: number
  media_url_https: string
  type: string // we care about type = "photo"
}

interface TootEntities {
  media: TootMedia[]
}

interface Toot {
  entities: TootEntities
}

interface TootMetadata {
  max_id_str: string
}

interface TwitterSearchResponse {
  statuses: Toot[]
  search_metadata: TootMetadata
}

export const run = async () =>
  // event: EventBridgeEvent<'Scheduled Event', any>,
  // context: Context
  {
    const queueUrl = process.env.TOOTED_PHOTOS_QUEUE;
    if (!queueUrl) {
      throw new Error('must receive a queue url')
    }

    const tableName = process.env.DYNAMO_TABLE_NAME;
    if (!tableName) {
      throw new Error('must receive a dynamodb table name')
    }

    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN

    if (!twitterBearerToken) {
      throw new Error(
        'must receive a twitter bearer token from the environment'
      )
    }

    try {
      if (!twitterAPI) {
        twitterAPI = axios.create({
          headers: {
            Authorization: `Bearer ${twitterBearerToken}`,
          },
        })
      }

      const getParams: GetItemInput = {
        TableName: tableName,
        Key: { type: { S: 'twitter-page-id' } },
      }

      const getResult = await ddb.getItem(getParams).promise()

      let searchURL =
        'https://api.twitter.com/1.1/search/tweets.json?q=from%3Apauldambra&result_type=recent'

      if (getResult?.Item) {
        const last_seen_toot_id = getResult.Item?.id?.S

        if (last_seen_toot_id) {
          searchURL += `&since_id=${last_seen_toot_id}`
        }
      }

      const response = await twitterAPI.get(searchURL)
      const { statuses, search_metadata } =
        response.data as TwitterSearchResponse

      const withPhotos = statuses.filter((s) =>
        s.entities?.media?.some((m) => m.type === 'photo')
      )

      console.log({ withPhotos, search_metadata })

      const params: PutItemInput = {
        TableName: tableName,
        Item: {
          id: { S: search_metadata.max_id_str },
          type: { S: 'twitter-page-id' },
        },
      }

      await ddb.putItem(params).promise()

      const sends = withPhotos.map(wp => {
        const enqueueParams: SendMessageRequest = {
          QueueUrl: queueUrl,
          MessageBody: JSON.stringify(wp)
        }
        return sqs.sendMessage(enqueueParams).promise()
      })

      return Promise.all(sends)

    } catch (e) {
      console.error(e)
      throw e
    }
  }
