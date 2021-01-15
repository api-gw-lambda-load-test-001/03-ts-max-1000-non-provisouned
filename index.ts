import * as crypto from "crypto";
import {DocumentClient} from "aws-sdk/clients/dynamodb";

type Response = {
    statusCode: number;
    headers: {[key:string]: string};
    body: string
};

function load_region(): string {
    const region: string | undefined = process.env["AWS_REGION"];
    if (region == null) {
        throw new Error("Environment Variable \"AWS_REGION\" doesn't exist.");
    }
    return region;
}

function load_table_name(): string {
    const name: string | undefined = process.env["TABLE_NAME"];
    if (name == null) {
        throw new Error("Environment Variable \"TABLE_NAME\" doesn't exist")
    }
    return name;
}

function create_client(region: string): DocumentClient {
    return new DocumentClient({
        region: region,
        signatureVersion: "v4"
    });
}

async function get_query_count(table_name: string, id: string, client: DocumentClient): Promise<number> {
    const option: DocumentClient.QueryInput = {
        TableName: table_name,
        KeyConditionExpression: "#id = :id",
        ExpressionAttributeNames: {
            "#id": "id"
        },
        ExpressionAttributeValues: {
            ":id": id
        },
        Select: "COUNT"
    };
    const resp = await client.query(option).promise();
    return resp.Count;
}

function generate_random_id(): string {
    const num_max = 200000;
    const num_min = 1;
    const num = Math.floor(Math.random() * (num_max + 1 - num_min)) + num_min;
    const md5 = crypto.createHash("md5");
    return md5.update(String(num), 'binary').digest("hex");
}

function create_response(count: number): Response {
    return {
        statusCode: 200,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
            result: count > 0
        })
    };
}

function create_error_response(): Response {
    return {
        statusCode: 500,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({
            message: "error in server"
        })
    }
}

async function wait(sec: number): Promise<void> {
    return new Promise((ok) => {
        setTimeout(() => {
            ok();
        }, sec * 1000);
    });
}

exports.handler = async function(event: any) {
    let response: Response;
    try {
        const region = load_region();
        const table_name = load_table_name();
        const client = create_client(region);
        const id = generate_random_id();
        const count: number = await get_query_count(table_name, id, client);
        if (count == 0) {
            await wait(2);
        }
        response = create_response(count);
    } catch (e) {
        console.error(e);
        response = create_error_response();
    }
    return response;
}