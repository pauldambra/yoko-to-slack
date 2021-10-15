import { SQSEvent } from "aws-lambda";

export const run = async (event: SQSEvent) => {
  event.Records.forEach(r => {
    console.log({ r })
  })
  throw new Error('no processing yet')
}