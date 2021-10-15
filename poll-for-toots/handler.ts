import * as AWSXRay from 'aws-xray-sdk'
import http from 'http';
import https from 'https';

AWSXRay.captureHTTPsGlobal(http);
AWSXRay.captureHTTPsGlobal(https);

import { Context, EventBridgeEvent } from 'aws-lambda'

import axios, {AxiosInstance} from "axios";

import DynamoDB, {PutItemInput} from "aws-sdk/clients/dynamodb"
const ddb = new DynamoDB()

let twitterAPI: AxiosInstance

interface TootMedia {
  id: number,
  media_url_https: string,
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

export const run = async (
  event: EventBridgeEvent<'Scheduled Event', any>,
  context: Context
) => {
  try {
    const twitterBearerToken =
        process.env.TWITTER_BEARER_TOKEN

    if (!twitterBearerToken) {
      throw new Error('must receive a twitter bearer token from the environment')
    }

    if (!twitterAPI) {
      twitterAPI = axios.create({
        headers: {
          "Authorization": `Bearer ${twitterBearerToken}`
        }
      })
    }

    const time = new Date()
    console.log(
        `Your cron function "${context.functionName}" ran at ${time}: ${event}`
    )

    const searchURL =
        'https://api.twitter.com/1.1/search/tweets.json?q=from%3Apauldambra&result_type=recent'

    const response = await twitterAPI.get(searchURL)
    const {statuses, search_metadata} = response.data as TwitterSearchResponse

    console.log({statuses, search_metadata})

    let tableName = process.env.DYNAMO_TABLE_NAME;
    if (!tableName) {
      throw new Error('must receive a dynamodb table name')
    }
    const params: PutItemInput = {
      TableName: tableName,
      Item: {
        'id': {S: search_metadata.max_id_str},
        'type': {S: 'twitter-page-id'}
      }
    };

    await ddb.putItem(params).promise()
  } catch (e) {
    console.error(e)
    throw e
  }
}
