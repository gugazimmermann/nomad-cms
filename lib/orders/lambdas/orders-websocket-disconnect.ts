import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import { createResponse } from "./utils";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const params = {
    TableName: TABLE_NAME,
    Key: {
      connectionId: event.requestContext.connectionId
    }
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    await db.delete(params).promise();
    return createResponse(200, JSON.stringify({ message: 'Disconnected.'}));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return createResponse(501, JSON.stringify(error));
  }
};
