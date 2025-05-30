import {app} from "./app.js";
import connectDB from "./db/index.js";
import dotenv from "dotenv";

dotenv.config();
connectDB()
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Failed to connect to MongoDB", err));

const PORT = 3000 || process.env.PORT;



app.listen(PORT, () => {
  console.log(`User service is running on port ${PORT}`);
}
);

