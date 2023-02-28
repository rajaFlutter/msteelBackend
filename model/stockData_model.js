const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

let stockDataSchema = mongoose.Schema({
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
    thickness: {
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

const stockDataModel = mongoose.model("stockData", stockDataSchema);

module.exports = stockDataModel;