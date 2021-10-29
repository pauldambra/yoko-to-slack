import { dynamoDB } from '../tracedClients'

const tableName = process.env.DYNAMO_SESSION_STORE
if (!tableName) {
  throw new Error('must receive a dynamodb session store table name')
}

export const get = async (sid: string) => {
  const params = {
    TableName: tableName,
    Key: { sid: { S: sid } },
  }
  const getResult = await dynamoDB.getItem(params).promise()
  const sessionValue = getResult?.Item?.session?.S as string
  return JSON.parse(sessionValue || '{}')
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
  return await dynamoDB.putItem(params).promise()
}

export const remove = async (sid: string) => {
  const params = {
    TableName: tableName,
    Key: { sid: { S: sid } },
  }
  return await dynamoDB.deleteItem(params).promise()
}
