import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

mongoose.connect(process.env.MONGO_URI || "mongodb://127.0.0.1:27017/getrighthome")
  .then(async () => {
    const properties = await mongoose.connection.db.collection('properties').find({}, {projection: {propertyName: 1, propertyType: 1, transactionType: 1, propertyCategory: 1}}).limit(20).toArray();
    console.log(JSON.stringify(properties, null, 2));
    process.exit(0);
  });
