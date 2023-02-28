const mongoose = require("mongoose");
const schemaType = mongoose.Schema.Types;

let stockSchema = mongoose.Schema({
    stockName: {
        type: schemaType.String,
    },
    stateName: {
        type: schemaType.String,
    },
    stockDate: {
        type: schemaType.String,
    },
    businessType: {
        type: schemaType.String,
    },
    stockPrice: {
        type: schemaType.Number,
        default: 0,
    },
    stockData: [
        {
            type: schemaType.ObjectId,
            ref: "stockData"
        }
    ]

});

const stockModel = mongoose.model("stock", stockSchema);

module.exports = stockModel;