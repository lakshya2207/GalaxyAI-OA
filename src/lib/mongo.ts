import mongoose from 'mongoose';

const MONGO_URI = process.env.MONGO_URI; // Store your MongoDB URI in .env

export const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }
  await mongoose.connect(MONGO_URI!, {
    // useNewUrlParser: true,
    // useUnifiedTopology: true,
  });
};
