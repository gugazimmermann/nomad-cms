import AWS = require("aws-sdk");
import { ORDER_STATUS } from "./common/enums";
import { ItemType } from "./common/types";
import commonResponse from "./common/commonResponse";

const TABLE_NAME = process.env.TABLE_NAME || "";
const BUCKET_NAME = process.env.ordersLogsBucketName || "";
const db = new AWS.DynamoDB.DocumentClient();

const writeLog = async (order: ItemType): Promise<void> => {
  const datepath = new Date().toISOString().split("T")[0].split("-");
  const keyName = `logs/${datepath[0]}/${datepath[1]}/${datepath[2]}/${order.orderID}.json`;
  try {
    await new AWS.S3()
      .upload({
        Bucket: BUCKET_NAME,
        Key: keyName,
        Body: JSON.stringify(order),
      })
      .promise();
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
  }
};

export const handler = async (event: ItemType) => {
  console.debug(`event`, JSON.stringify(event, undefined, 2));

  const order = event;

  if (order.status === ORDER_STATUS.PAYMENT_SUCCESS)
    order.status = ORDER_STATUS.WAITING;

  const params = {
    TableName: TABLE_NAME,
    Item: order,
  };
  console.debug(`params`, JSON.stringify(params, undefined, 2));

  try {
    await db.put(params).promise();
    await writeLog(order);
    return commonResponse(200, JSON.stringify(order));
  } catch (error) {
    console.error(`error`, JSON.stringify(error, undefined, 2));
    return commonResponse(500, JSON.stringify(error));
  }
};
