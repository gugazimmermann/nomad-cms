import * as AWS from "aws-sdk";
import { APIGatewayProxyResult, APIGatewayEvent } from "aws-lambda";
import commonResponse from "./common/commonResponse";

const TABLE_NAME = process.env.TABLE_NAME || "";

const db = new AWS.DynamoDB.DocumentClient();

export const handler = async (
  event: APIGatewayEvent
): Promise<APIGatewayProxyResult> => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const restaurantID = event.pathParameters?.restaurantID;
  const orderID = event.pathParameters?.orderID;
  if (!restaurantID || !orderID)
    return commonResponse(400, "You are missing the restaurantID or orderID");

  const params = {
    TableName: TABLE_NAME,
    Key: {
      restaurantID: restaurantID,
      orderID: orderID,
    },
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    await db.delete(params).promise();
    return commonResponse(204, JSON.stringify({}));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }
};
