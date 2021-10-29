import { cloudwatch } from './tracedClients'
import {
  MetricDatum,
  PutMetricDataInput,
} from 'aws-sdk/clients/cloudwatch'

export const cloudwatchCounter = async (
  count: number,
  metricName: string,
  dimension: { Value: string; Name: string }
) => {
  console.log(
    {
      count,
      metricName,
      dimension,
    },
    'logging a single counter'
  )

  const response = await cloudwatch
    .putMetricData({
      Namespace: 'slack-to-yoko',
      MetricData: [
        {
          MetricName: metricName,
          Timestamp: new Date(),
          Unit: 'Count',
          Value: count,
          Dimensions: [dimension],
        } as MetricDatum,
      ],
    } as PutMetricDataInput)
    .promise()
  console.log(response)
}
