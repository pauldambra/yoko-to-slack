import { SQSEvent } from 'aws-lambda'

import Rekognition from 'aws-sdk/clients/rekognition'

import { AWSError } from 'aws-sdk'
import { PromiseResult } from 'aws-sdk/lib/request'
import { Toot, TootMediaProcessing } from '../types'
import { axios, rekognition, sqs } from '../tracedClients'

const downloadPhoto = async (
  download_url: string
): Promise<Buffer> => {
  const response = await axios.get(download_url, {
    responseType: 'arraybuffer',
  })
  return Buffer.from(response.data as string, 'base64')
}

const detectLabels = (buffer: Buffer) =>
  rekognition
    .detectLabels({
      Image: {
        Bytes: buffer,
      },
    })
    .promise()

const mapLabels = (
  rr: PromiseResult<Rekognition.DetectLabelsResponse, AWSError>,
  toot: Toot
) =>
  ({
    Labels: rr.Labels,
    toot: toot,
  } as TootMediaProcessing)

const expandForEachImageInTheToot = (t: Toot) =>
  t.entities.media.map((m) => ({
    toot: t,
    media: m,
  }))

export const run = async (event: SQSEvent) => {
  const queueUrl = process.env.FOUND_DOG_QUEUE
  if (!queueUrl) {
    throw new Error('must receive found dog queue url')
  }

  const processedTootMedia: TootMediaProcessing[] = await Promise.all(
    event.Records.map((r) => JSON.parse(r.body))
      .flatMap(expandForEachImageInTheToot)
      .map((x) => {
        const mediaUrl = x.media.media_url_https
        console.log({ mediaUrl, toot: x.toot })

        return downloadPhoto(mediaUrl)
          .then(detectLabels)
          .then((labelsResponse) => mapLabels(labelsResponse, x.toot))
      })
  )

  const tootsWithDogs = processedTootMedia.filter(
    (potentialDogToot) =>
      potentialDogToot.Labels?.some(
        (l) => l?.Name?.toLowerCase() === 'dog'
      )
  )

  // todo - for a toot with M dog pictures this processes the toot M times
  const sends = tootsWithDogs.map((twd) =>
    sqs
      .sendMessage({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(twd),
      })
      .promise()
  )

  await Promise.all(sends)
}
