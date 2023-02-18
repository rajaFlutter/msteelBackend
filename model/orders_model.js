const mongoose = require("mongoose");

const schemaType = mongoose.Schema.Types;

const orderSchema = mongoose.Schema({

    date: {
        type: schemaType.String,
    },
    time: {
        type: schemaType.String,
    },
    fullName: {
        type: schemaType.String,
    },
    number: {
        type: schemaType.String,
    },
    state: {
        type: schemaType.String,
    },
    plantLoc: {
        type: schemaType.String,
    },
    productName: {
        type: schemaType.String,
    },
    netPrice: {
        type: schemaType.Number,
    },
    orderQuantity: {
        type: schemaType.Number,
    },
    orderAmount: {
        type: schemaType.Number,
    },
    status: {
        type: schemaType.Boolean,
    },
    orderNumber: {
        type: schemaType.Number,
    }
});

const orderModel = mongoose.model("order", orderSchema);

module.exports = orderModel;