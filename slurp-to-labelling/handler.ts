import { SQSEvent } from 'aws-lambda'

import Rekognition, { Labels } from 'aws-sdk/clients/rekognition'

import { AWSError } from 'aws-sdk'
import { PromiseResult } from 'aws-sdk/lib/request'
import { Toot } from '../types'
import { axios, rekognition } from '../tracedClients'

const downloadPhoto = async (
  download_url: string
): Promise<Buffer> => {
  const response = await axios.get(download_url, {
    responseType: 'arraybuffer',
  })
  return Buffer.from(response.data as string, 'base64')
}

interface TootMediaProcessing {
  Labels?: Labels
  toot: Toot
}

export const run = async (event: SQSEvent) => {
  const processedTootMedia: TootMediaProcessing[] = await Promise.all(
    event.Records.map((r) => JSON.parse(r.body)).map((toot) => {
      const mediaUrl = toot.entities.media[0].media_url
      return downloadPhoto(mediaUrl)
        .then((buffer) =>
          rekognition
            .detectLabels({
              Image: {
                Bytes: buffer,
              },
            })
            .promise()
        )
        .then(
          (
            rr: PromiseResult<
              Rekognition.DetectLabelsResponse,
              AWSError
            >
          ) =>
            ({
              Labels: rr.Labels,
              toot: toot,
            } as TootMediaProcessing)
        )
    })
  )
  const tootsWithDogs = processedTootMedia.filter(
    (potentialDogToot) => {
      console.log({ potentialDogToot })
      return potentialDogToot.Labels?.some((l) =>
        l?.Name?.toLowerCase().includes(' dog ')
      )
    }
  )
  console.log({ tootsWithDogs })
  throw new Error('no processing yet')
}
