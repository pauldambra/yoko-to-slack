import { SQSEvent } from 'aws-lambda'

export const run = async (event: SQSEvent) => {
  console.log(event, 'found a dog')
}
