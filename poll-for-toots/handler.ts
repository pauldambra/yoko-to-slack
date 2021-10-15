import * as AWSXRay from 'aws-xray-sdk'
import https from 'https'
AWSXRay.captureHTTPs(https)
import { Context, EventBridgeEvent } from 'aws-lambda'

import axios, {AxiosInstance} from "axios";

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
  const {statuses,search_metadata}  = response.data as TwitterSearchResponse

  console.log({statuses, search_metadata})

}
