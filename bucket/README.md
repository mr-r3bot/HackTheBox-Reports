```
roy:n2vM-<_K_Q:.Aa2
```



----------------------
netstat -auntp

127.0.0.1:8000




-----------------------
let params = {
    "TableName": "alerts",
    "KeySchema": [
            { AttributeName: "title", KeyType: "HASH" },
            { AttributeName: "data", KeyType: "RANGE"}
        ],
        
    "AttributeDefinitions": [
            { AttributeName: "title", AttributeType: "S" },
            { AttributeName: "data", AttributeType: "S" },
        ],
        
        "ProvisionedThroughput": {
     "ReadCapacityUnits": 5,
    "WriteCapacityUnits": 5 }


}

dynamodb.createTable(params, (err,data) => {
    if (err) console.log(err)
    else console.log(data)
})


