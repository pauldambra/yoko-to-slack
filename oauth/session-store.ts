import { dynamoDB } from '../tracedClients'
import { AttributeMap } from 'aws-sdk/clients/dynamodb'

interface AsWritten {
  id: string
  session: AttributeMap
}

const tableName = process.env.DYNAMO_SESSION_STORE
if (!tableName) {
  throw new Error('must receive a dynamodb session store table name')
}

export const get = async (sid: string) => {
  const params = {
    TableName: tableName,
    Key: { sid: { S: sid } },
  }
  console.log({ getParams: params })
  const getResult = await dynamoDB.getItem(params).promise()
  const session = (getResult.Item as unknown as AsWritten).session
  const sessionValue = session.S as string
  console.log({ getResult, sessionValue, session })
  return JSON.parse(sessionValue)
}

export const set = async (
  sid: string,
  json: Record<string, unknown>
) => {
  const session = JSON.stringify(json)
  const params = {
    TableName: tableName,
    Item: {
      sid: { S: sid },
      session: { S: session },
    },
  }
  console.log({ putParams: params, sid, json, session })
  const putResult = await dynamoDB.putItem(params).promise()
  console.log({ putResult })
}

export const remove = async (sid: string) => {
  const params = {
    TableName: tableName,
    Key: { sid: { S: sid } },
  }
  console.log({ deleteParams: params })
  return dynamoDB.deleteItem(params).promise()
}
