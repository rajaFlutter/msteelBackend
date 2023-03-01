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
    stockData: {

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
        fields: {
            type: schemaType.Array,
        },
        allData:
        {
            type: schemaType.Mixed,
        }

    }

});

const stockModel = mongoose.model("stock", stockSchema);

module.exports = stockModel;