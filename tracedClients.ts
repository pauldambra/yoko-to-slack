import * as AWSXRay from 'aws-xray-sdk-core'
import http from 'http'
import https from 'https'
AWSXRay.captureHTTPsGlobal(http)
AWSXRay.captureHTTPsGlobal(https)
import { default as _axios } from 'axios'
import DynamoDB from 'aws-sdk/clients/dynamodb'
import Sqs from 'aws-sdk/clients/sqs'
import Rekognition from 'aws-sdk/clients/rekognition'
import { CloudWatch } from 'aws-sdk'

const ddbUntraced = new DynamoDB()
const sqsUntraced = new Sqs()
const rekognitionUntraced = new Rekognition()
const cloudwatchUntraced = new CloudWatch()

export const rekognition = AWSXRay.captureAWSClient(
  rekognitionUntraced
)
export const dynamoDB = AWSXRay.captureAWSClient(ddbUntraced)
export const sqs = AWSXRay.captureAWSClient(sqsUntraced)
export const axios = _axios
export const cloudwatch = AWSXRay.captureAWSClient(cloudwatchUntraced)
