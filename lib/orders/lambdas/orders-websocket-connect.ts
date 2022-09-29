import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayProxyEvent } from "aws-lambda";
import commonResponse from "./common/commonResponse";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const params = {
    TableName: TABLE_NAME,
    Item: {
      connectionId: event.requestContext.connectionId,
    },
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    await db.put(params).promise();
    return commonResponse(200, JSON.stringify({ message: "Connected." }));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(501, JSON.stringify(error));
  }
};
