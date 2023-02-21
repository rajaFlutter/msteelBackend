const mongoose = require("mongoose");
const schemaType = mongoose.Schema.Types;

let stockSchema = mongoose.Schema({
    stateName: {
        type: schemaType.String,
    },
    stockName: {
        type: schemaType.String,
    },
    businessType: {
        type: schemaType.String,
    },
    stockDate: {
        type: schemaType.Date,
    },
    basic: {
        type: schemaType.String,
    },
    loading: {
        type: schemaType.String,
    },
    insurance: {
        type: schemaType.String,
    },
    gst: {
        type: schemaType.String,
    },
    tcs: {
        type: schemaType.String,
    },
    fields: [
        {
            type: schemaType.String,
        }
    ],
    allData: [
        {
            type: schemaType.Mixed,
        }
    ]
});

const stockModel = mongoose.model("stock", stockSchema);

module.exports = stockModel;