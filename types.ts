import { Labels } from 'aws-sdk/clients/rekognition'

export interface TootMedia {
  id: number
  media_url_https: string
  type: string // we care about type = "photo"
}

export interface TootEntities {
  media: TootMedia[]
}

export interface Toot {
  entities: TootEntities
  text: string
  id_str: string
}

export interface TootMediaProcessing {
  Labels?: Labels
  toot: Toot
}
