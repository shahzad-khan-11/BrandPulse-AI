import { connect } from '../database/index.js';

const connectDB = async () => {
  await connect();
};

export default connectDB;
