import { SQSEvent } from 'aws-lambda'

import Rekognition, { DetectLabelsRequest } from 'aws-sdk/clients/rekognition'
import axios from 'axios'

const rekognition = new Rekognition()

const getFileContentById = async (
  download_url: string
): Promise<Buffer> => {
  const response = await axios.get(download_url, {
    responseType: 'arraybuffer'
  })
  return Buffer.from((response.data as string), 'base64')
}

export const run = async (event: SQSEvent) => {
  const labels = await Promise.all(event.Records.map(r => JSON.parse(r.body)).map(toot => {
    const mediaUrl = toot.entities.media[0].media_url
    return getFileContentById(mediaUrl).then(buffer => {
      console.log({ mediaUrl, buffer, e: toot.entities, m: toot.entities.media })
      const dlp: DetectLabelsRequest = {
        Image: {
          Bytes: buffer
        }
      }
      return rekognition.detectLabels(dlp).promise()
    })

  }))
  console.log(labels)
  throw new Error('no processing yet')
}