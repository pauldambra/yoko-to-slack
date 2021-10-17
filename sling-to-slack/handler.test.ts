import { run } from './handler'
import { SQSEvent, SQSRecord } from 'aws-lambda'
import * as AWSXray from 'aws-xray-sdk-core'

import axios from 'axios'

// Mock out all top level functions, such as get, put, delete and post:
jest.mock('axios')

const sqsMessageFor = (body: {
  toot: {
    entities: { media: { media_url_https: string }[] }
    text: string
  }
}) => ({
  attributes: {
    ApproximateReceiveCount: '',
    SentTimestamp: '',
    SenderId: '',
    ApproximateFirstReceiveTimestamp: '',
  },
  awsRegion: '',
  body: JSON.stringify(body),
  eventSource: '',
  eventSourceARN: '',
  md5OfBody: '',
  messageAttributes: {},
  messageId: '',
  receiptHandle: '',
})

describe('when a toot has been found with at least one dog photo', () => {
  beforeAll(() => {
    process.env.SLACK_WEBHOOK_URL = 'https://testing'
    AWSXray.setContextMissingStrategy(() => {})
  })

  it('can send to slack with one photo', async () => {
    const mockedPost = axios.post as jest.Mock

    const record: SQSRecord = sqsMessageFor({
      toot: {
        text: 'the text',
        entities: { media: [{ media_url_https: 'first' }] },
      },
    })
    const event: SQSEvent = { Records: [record] }
    await run(event)

    expect(mockedPost).toHaveBeenCalledWith(
      'https://testing',
      {
        text: 'the text',
        blocks: [
          {
            text: {
              text: 'the text',
              type: 'mrkdwn',
            },
            type: 'section',
          },
          {
            alt_text: 'another image',
            image_url: 'first',
            type: 'image',
          },
        ],
      },
      {
        headers: { contentType: 'application/json' },
      }
    )
  })

  it('can send to slack with many photos', async () => {
    const mockedPost = axios.post as jest.Mock

    const record: SQSRecord = sqsMessageFor({
      toot: {
        text: 'the text',
        entities: {
          media: [
            { media_url_https: 'first' },
            { media_url_https: 'second' },
          ],
        },
      },
    })
    const event: SQSEvent = { Records: [record] }
    await run(event)

    expect(mockedPost).toHaveBeenCalledWith(
      'https://testing',
      {
        text: 'the text',
        blocks: [
          {
            text: {
              text: 'the text',
              type: 'mrkdwn',
            },
            type: 'section',
          },
          {
            alt_text: 'another image',
            image_url: 'first',
            type: 'image',
          },
          {
            alt_text: 'another image',
            image_url: 'second',
            type: 'image',
          },
        ],
      },
      {
        headers: { contentType: 'application/json' },
      }
    )
  })
})
